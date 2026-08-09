import { useState, useEffect, useCallback } from "react";
import {
  ActionPanel,
  Action,
  Grid,
  Clipboard,
  Toast,
  showToast,
  closeMainWindow,
  getPreferenceValues,
} from "@raycast/api";
import { writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { showFailureToast } from "@raycast/utils";
import { fileTypeFromBuffer } from "file-type";
import { CapacitiesClient } from "@capacities/api";

// Constants
const SEARCH_DEBOUNCE_MS = 500;
const GRID_COLUMNS = 4;
const SUPPORTED_IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp", "bmp", "tiff"] as const;

// Titles/episodes are excluded — they're not "cover art" for a movie, show, or game.
const EXCLUDED_IMDB_QIDS = new Set(["tvEpisode", "podcastEpisode"]);

const IMDB_TYPE_LABELS: Record<string, string> = {
  movie: "Movie",
  tvSeries: "TV Series",
  tvMiniSeries: "Miniseries",
  tvMovie: "TV Movie",
  tvSpecial: "TV Special",
  videoGame: "Video Game",
  video: "Video",
  short: "Short",
  podcastSeries: "Podcast",
};

// Types
interface SearchItem {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  pageUrl: string;
}

interface Preferences {
  capacitiesApiToken?: string;
  capacitiesObjectType?: string;
  capacitiesCoverProperty?: string;
  capacitiesImageCollection?: string;
}

// Utility functions
const isValidImageExtension = (extension: string): extension is (typeof SUPPORTED_IMAGE_EXTENSIONS)[number] => {
  return SUPPORTED_IMAGE_EXTENSIONS.includes(extension as (typeof SUPPORTED_IMAGE_EXTENSIONS)[number]);
};

const extractFileExtension = (url: string): string => {
  const fileName = url.split("/").pop() || "";
  return fileName.split(".").pop()?.toLowerCase() || "";
};

const createTempImageFile = async (buffer: Buffer, extension: string): Promise<string> => {
  const tempFileName = `${randomUUID()}.${extension}`;
  const tempFilePath = path.join(os.tmpdir(), tempFileName);
  await writeFile(tempFilePath, buffer);
  return tempFilePath;
};

const determineImageExtension = async (buffer: Buffer, originalExtension: string): Promise<string> => {
  if (originalExtension && isValidImageExtension(originalExtension)) {
    return originalExtension;
  }

  const fileType = await fileTypeFromBuffer(buffer);
  const detectedExtension = fileType?.ext;

  if (detectedExtension && isValidImageExtension(detectedExtension)) {
    return detectedExtension;
  }

  throw new Error("Unsupported image format");
};

const parseJsonSafe = async <T,>(response: Response): Promise<T | undefined> => {
  try {
    return (await response.json()) as T;
  } catch {
    return undefined;
  }
};

const downloadImageBuffer = async (imageUrl: string): Promise<Buffer> => {
  const response = await fetch(imageUrl);

  if (!response.ok) {
    throw new Error(`Failed to download image: HTTP ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
};

// ---- IMDb ----
// IMDb's own (unofficial, undocumented) search-suggestion endpoint — the same one imdb.com's
// search box uses. No API key needed. Covers movies, TV, anime, and video games in one search,
// each with an official IMDb poster/cover image.
interface ImdbSuggestionItem {
  id: string;
  l?: string;
  q?: string;
  qid?: string;
  y?: number;
  i?: { imageUrl?: string; width?: number; height?: number };
}

interface ImdbSuggestionResponse {
  d?: ImdbSuggestionItem[];
}

const getImdbSuggestionBucket = (query: string): string => {
  const firstChar = query.trim().toLowerCase().charAt(0);
  return /^[a-z0-9]$/.test(firstChar) ? firstChar : "_";
};

const searchImdb = async (query: string): Promise<SearchItem[]> => {
  const bucket = getImdbSuggestionBucket(query);
  const encodedQuery = encodeURIComponent(query.trim());
  const response = await fetch(`https://v2.sg.media-imdb.com/suggestion/${bucket}/${encodedQuery}.json`);
  const data = await parseJsonSafe<ImdbSuggestionResponse>(response);

  if (!response.ok) {
    throw new Error(`IMDb error: HTTP ${response.status}`);
  }

  return (data?.d || [])
    .filter(
      (item) => item.id.startsWith("tt") && item.qid && !EXCLUDED_IMDB_QIDS.has(item.qid) && item.i?.imageUrl && item.l,
    )
    .map((item) => {
      const typeLabel = (item.qid && IMDB_TYPE_LABELS[item.qid]) || item.q || "Title";
      const { width, height } = item.i || {};
      const subtitleParts = [typeLabel, width && height ? `${width}×${height}` : undefined];
      return {
        id: item.id,
        title: item.l as string,
        subtitle: subtitleParts.filter(Boolean).join(" · "),
        imageUrl: item.i?.imageUrl as string,
        pageUrl: `https://www.imdb.com/title/${item.id}/`,
      };
    });
};

// ---- Capacities ----
// Everything here is resolved by the names shown in the Capacities UI (configured in the
// extension's preferences), so this works against any space's schema rather than one specific
// setup. The flow: find the object whose title matches the search result, create an Image object
// from the picture's URL, then link that image via the configured cover property. Collection and
// category are applied to the created Image object, not to the matched object.
const CAPACITIES_IMAGE_STRUCTURE_ID = "MediaImage";

// Category set on every uploaded cover. Both ids are Capacities built-ins present in every space —
// the property is on the SDK's upsertable whitelist for MediaImage, and "Cover" is a default,
// unremovable option — so they can be referenced directly rather than resolved at runtime.
const CAPACITIES_IMAGE_CATEGORY_PROPERTY_ID = "media_imageCategory";
const CAPACITIES_IMAGE_CATEGORY_COVER_OPTION_ID = "cover";

const normalize = (value: string): string => value.trim().toLowerCase();

const addCoverToCapacities = async (preferences: Preferences, item: SearchItem): Promise<string> => {
  const { capacitiesApiToken, capacitiesObjectType, capacitiesCoverProperty, capacitiesImageCollection } = preferences;

  if (!capacitiesApiToken) {
    throw new Error("Add a Capacities API token in the extension preferences.");
  }
  if (!capacitiesObjectType || !capacitiesCoverProperty) {
    throw new Error("Set the Capacities object type(s) and cover property in the extension preferences.");
  }

  const requestedTypeNames = capacitiesObjectType
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
  if (requestedTypeNames.length === 0) {
    throw new Error("Set at least one Capacities object type in the extension preferences.");
  }

  const capacities = new CapacitiesClient({ apiToken: capacitiesApiToken });
  const { structures } = await capacities.space.structures();

  // Each requested type may be a different structure with its own cover property definition (and
  // even its own property id for a field with the same name) — e.g. "Media" and "Game" can each
  // have their own "Cover image" property. Resolve every requested type's structure and cover
  // property up front, so a typo fails fast instead of leaving a stray image object behind.
  const coverPropertyByStructureId = new Map<string, string>();
  for (const typeName of requestedTypeNames) {
    const structure = structures.find(
      (candidate) =>
        normalize(candidate.title) === normalize(typeName) || normalize(candidate.pluralName) === normalize(typeName),
    );
    if (!structure) {
      throw new Error(`No object type named "${typeName}" exists in your Capacities space.`);
    }

    const coverProperty = structure.propertyDefinitions.find(
      (property) => normalize(property.name) === normalize(capacitiesCoverProperty) && property.type === "entity",
    );
    if (!coverProperty) {
      throw new Error(`"${typeName}" has no object-link property named "${capacitiesCoverProperty}".`);
    }
    if (!coverProperty.writable) {
      throw new Error(`The "${capacitiesCoverProperty}" property on "${typeName}" cannot be set via the API.`);
    }

    coverPropertyByStructureId.set(structure.id, coverProperty.id);
  }

  // Resolve the optional collection before creating anything, so a typo fails fast instead of
  // leaving a stray image object behind.
  const imageStructure = structures.find((structure) => structure.id === CAPACITIES_IMAGE_STRUCTURE_ID);

  let collectionId: string | undefined;
  if (capacitiesImageCollection) {
    const collection = imageStructure?.collections.find(
      (candidate) => normalize(candidate.title) === normalize(capacitiesImageCollection),
    );
    if (!collection) {
      throw new Error(`No image collection named "${capacitiesImageCollection}" exists in your Capacities space.`);
    }
    collectionId = collection.id;
  }

  const { results } = await capacities.objects.search({
    query: item.title,
    structureIds: [...coverPropertyByStructureId.keys()],
    limit: 1,
  });
  const target = results[0];
  if (!target) {
    throw new Error(
      `No ${requestedTypeNames.map((name) => `"${name}"`).join("/")} object in Capacities matches "${item.title}".`,
    );
  }

  // The matched object may belong to any of the requested types, each with its own cover
  // property id — look up the one for whichever structure actually matched.
  const coverPropertyId = coverPropertyByStructureId.get(target.structureId);
  if (!coverPropertyId) {
    throw new Error(`Matched object has an unexpected type in Capacities.`);
  }

  const createdImage = await capacities.object.createFromUrl({
    url: item.imageUrl,
    properties: { title: { type: "title", title: { value: `${item.title} cover` } } },
  });

  await capacities.object.update({
    id: createdImage.id,
    ...(collectionId ? { collections: [collectionId] } : {}),
    properties: {
      [CAPACITIES_IMAGE_CATEGORY_PROPERTY_ID]: {
        type: "label",
        label: [{ id: CAPACITIES_IMAGE_CATEGORY_COVER_OPTION_ID, name: "Cover" }],
      },
    },
  });

  await capacities.object.update({
    id: target.id,
    properties: {
      [coverPropertyId]: { type: "entity", entity: [{ id: createdImage.id }] },
    },
  });

  return target.title;
};

// Main component
export default function SearchCoverArtCommand() {
  const [isLoading, setIsLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [items, setItems] = useState<SearchItem[]>([]);

  const preferences = getPreferenceValues<Preferences>();

  const runSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const results = await searchImdb(query);
      setItems(results);
    } catch (error) {
      console.error("Error searching images:", error);
      await showFailureToast(error, { title: "Failed to search" });
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleCopyImageToClipboard = useCallback(async (imageUrl: string) => {
    await showToast({
      title: "Copying image to clipboard...",
      style: Toast.Style.Animated,
    });

    try {
      const buffer = await downloadImageBuffer(imageUrl);
      const originalExtension = extractFileExtension(imageUrl);
      const extension = await determineImageExtension(buffer, originalExtension);
      const tempFilePath = await createTempImageFile(buffer, extension);

      await Clipboard.copy({ file: tempFilePath });
      closeMainWindow();

      await showToast({
        title: "Image copied to clipboard",
        style: Toast.Style.Success,
      });
    } catch (error) {
      await showFailureToast(error, {
        title: "Failed to copy image to clipboard",
      });
    }
  }, []);

  const handleAddCoverToCapacities = useCallback(
    async (item: SearchItem) => {
      await showToast({ title: "Adding cover in Capacities...", style: Toast.Style.Animated });

      try {
        const matchedTitle = await addCoverToCapacities(preferences, item);
        await showToast({ title: `Cover added to "${matchedTitle}"`, style: Toast.Style.Success });
      } catch (error) {
        await showFailureToast(error, { title: "Failed to add cover in Capacities" });
      }
    },
    [preferences],
  );

  useEffect(() => {
    setIsLoading(true);
    const timeoutId = setTimeout(() => {
      runSearch(searchText);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(timeoutId);
      setIsLoading(false);
    };
  }, [searchText, runSearch]);

  return (
    <Grid
      columns={GRID_COLUMNS}
      isLoading={isLoading}
      fit={Grid.Fit.Fill}
      aspectRatio="2/3"
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search movies, TV, anime, and games on IMDb..."
    >
      <Grid.EmptyView title={searchText && !isLoading ? "No results found" : "Start typing to search IMDb"} />
      {items.map((item) => (
        <Grid.Item
          key={item.id}
          content={item.imageUrl}
          title={item.title}
          subtitle={item.subtitle}
          actions={
            <ActionPanel>
              <Action title="Copy Image to Clipboard" onAction={() => handleCopyImageToClipboard(item.imageUrl)} />
              <Action title="Add as Cover in Capacities" onAction={() => handleAddCoverToCapacities(item)} />
              <Action.CopyToClipboard content={item.imageUrl} title="Copy Image URL" />
              <Action.OpenInBrowser url={item.imageUrl} title="Open Image in Browser" />
              {/* eslint-disable-next-line @raycast/prefer-title-case -- "IMDb" is the correct brand casing */}
              <Action.OpenInBrowser url={item.pageUrl} title="View on IMDb" />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
