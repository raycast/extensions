import {
  Action,
  ActionPanel,
  Clipboard,
  Grid,
  Icon,
  LocalStorage,
  Toast,
  environment,
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
  Keyboard,
} from "@raycast/api";
import { execFile } from "node:child_process";
import { copyFile, readFile, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { promisify } from "node:util";
import { useEffect, useState } from "react";

type Provider = "klipy" | "giphy";
type View = Provider | "saved";
type MediaItem = {
  id: string;
  provider: Provider | "local";
  kind: "gif" | "image";
  title: string;
  previewUrl: string;
  mediaUrl: string;
  fileExtension?: string;
  pageUrl?: string;
  embedding?: number[];
};

const SAVED_GIFS_KEY = "saved-gifs";
const JINA_MODEL = "jina-clip-v2";
const execFileAsync = promisify(execFile);
const CLIPBOARD_IMAGE_SCRIPT = `
ObjC.import("AppKit");
ObjC.import("Foundation");
function run(argv) {
  const pasteboard = $.NSPasteboard.generalPasteboard;
  const png = pasteboard.dataForType($.NSPasteboardTypePNG);
  if (png) {
    png.writeToFileAtomically($(argv[0]), true);
    return;
  }
  const tiff = pasteboard.dataForType($.NSPasteboardTypeTIFF);
  if (!tiff) throw new Error("No image data on clipboard");
  const image = $.NSBitmapImageRep.imageRepWithData(tiff);
  const converted = image.representationUsingTypeProperties($.NSBitmapImageFileTypePNG, $());
  converted.writeToFileAtomically($(argv[0]), true);
}`;

type GiphyResponse = {
  data: Array<{
    id: string;
    title: string;
    url: string;
    images: { fixed_width: { url: string }; original: { url: string } };
  }>;
};

type KlipyResponse = {
  results: Array<{
    id: string;
    title: string;
    itemurl?: string;
    media_formats: {
      gif: { url: string };
      tinygif: { url: string };
    };
  }>;
};

type KlipyMemeResponse = {
  data: {
    data: Array<{
      id: number;
      title: string;
      file: {
        hd: { png: { url: string } };
        sm: { png: { url: string } };
      };
    }>;
  };
};

export default function Command() {
  const preferences = getPreferenceValues<Preferences.Index>();
  const [view, setView] = useState<View>("klipy");
  const [query, setQuery] = useState("");
  const [gifs, setGifs] = useState<MediaItem[]>([]);
  const [memes, setMemes] = useState<MediaItem[]>([]);
  const [savedGifs, setSavedGifs] = useState<MediaItem[]>([]);
  const [queryEmbedding, setQueryEmbedding] = useState<number[] | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);
  const apiKey =
    view === "giphy" ? preferences.giphyApiKey : preferences.klipyApiKey;

  useEffect(() => {
    LocalStorage.getItem<string>(SAVED_GIFS_KEY).then((value) => {
      const items = value
        ? (JSON.parse(value) as Array<MediaItem & { gifUrl?: string }>)
        : [];
      setSavedGifs(
        items.map((item) => ({
          ...item,
          kind: item.kind ?? "gif",
          mediaUrl: item.mediaUrl ?? item.gifUrl ?? "",
        })),
      );
    });
  }, []);

  useEffect(() => {
    if (view === "saved") {
      setIsLoading(false);
      return;
    }

    if (!apiKey) {
      setGifs([]);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      setIsLoading(true);
      try {
        const [gifResult, memeResult, embeddingResult] =
          await Promise.allSettled([
            fetchGifs(view, apiKey, query, controller.signal),
            view === "klipy"
              ? fetchKlipyMemes(apiKey, query, controller.signal)
              : Promise.resolve([]),
            query &&
            preferences.jinaApiKey &&
            savedGifs.some((item) => item.embedding)
              ? createJinaEmbedding(
                  preferences.jinaApiKey,
                  { text: query },
                  "retrieval.query",
                  controller.signal,
                )
              : Promise.resolve(null),
          ]);
        if (gifResult.status === "rejected") throw gifResult.reason;
        setGifs(gifResult.value);
        setMemes(memeResult.status === "fulfilled" ? memeResult.value : []);
        setQueryEmbedding(
          embeddingResult.status === "fulfilled" ? embeddingResult.value : null,
        );
        if (memeResult.status === "rejected" && !controller.signal.aborted) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Could not load KLIPY memes",
          });
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setGifs([]);
          await showToast({
            style: Toast.Style.Failure,
            title: "Could not load GIFs",
            message: error instanceof Error ? error.message : String(error),
          });
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [apiKey, preferences.jinaApiKey, query, savedGifs, view]);

  const visibleGifs =
    view === "saved"
      ? savedGifs.filter((gif) =>
          gif.title.toLowerCase().includes(query.toLowerCase()),
        )
      : gifs;
  const matchingSaved =
    view !== "saved" && queryEmbedding
      ? savedGifs
          .filter((item) => item.embedding)
          .map((item) => ({
            item,
            score: dotProduct(queryEmbedding, item.embedding!),
          }))
          .filter(({ score }) => score >= 0.2)
          .sort((a, b) => b.score - a.score)
          .slice(0, 5)
          .map(({ item }) => item)
      : [];

  useEffect(() => {
    const firstMatch = matchingSaved[0];
    if (firstMatch)
      setSelectedItemId(
        `matching-${firstMatch.provider}-${firstMatch.kind}-${firstMatch.id}`,
      );
  }, [
    matchingSaved[0]?.id,
    matchingSaved[0]?.kind,
    matchingSaved[0]?.provider,
  ]);

  async function toggleSaved(gif: MediaItem) {
    const isSaved = savedGifs.some(
      (saved) => saved.id === gif.id && saved.provider === gif.provider,
    );
    let itemToSave = gif;
    if (!isSaved && preferences.jinaApiKey && !gif.embedding) {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Creating visual embedding",
      });
      try {
        const image = await imageInput(gif.previewUrl, gif.fileExtension);
        itemToSave = {
          ...gif,
          embedding: await createJinaEmbedding(preferences.jinaApiKey, {
            image,
          }),
        };
        toast.style = Toast.Style.Success;
        toast.title = "Visual embedding created";
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Saved without semantic indexing";
        toast.message = error instanceof Error ? error.message : String(error);
      }
    }
    const next = isSaved
      ? savedGifs.filter(
          (saved) => saved.id !== gif.id || saved.provider !== gif.provider,
        )
      : [itemToSave, ...savedGifs];
    setSavedGifs(next);
    await LocalStorage.setItem(SAVED_GIFS_KEY, JSON.stringify(next));
    await showToast({
      style: Toast.Style.Success,
      title: isSaved ? "Removed from Saved" : "Saved GIF",
    });
  }

  async function copyMedia(item: MediaItem, paste = false) {
    const label = item.kind === "image" ? "image" : "GIF";
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Downloading ${label}`,
    });
    try {
      let file = item.mediaUrl;
      if (item.mediaUrl.startsWith("http")) {
        const response = await fetch(item.mediaUrl);
        if (!response.ok)
          throw new Error(`Download returned ${response.status}`);
        const extension =
          item.fileExtension ?? (item.kind === "image" ? "png" : "gif");
        file = join(
          environment.supportPath,
          `${item.provider}-${item.id.replace(/[^a-zA-Z0-9_-]/g, "-")}.${extension}`,
        );
        await writeFile(file, Buffer.from(await response.arrayBuffer()));
      }
      if (paste) {
        await Clipboard.paste({ file });
      } else {
        await Clipboard.copy({ file });
      }
      toast.style = Toast.Style.Success;
      toast.title = paste ? `Pasted ${label}` : `Copied ${label}`;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = paste
        ? `Could not paste ${label}`
        : `Could not copy ${label}`;
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  async function saveClipboardMedia() {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Importing clipboard media",
    });
    try {
      const clipboard = await Clipboard.read();
      const id = `${Date.now()}`;
      let source = clipboard.file ?? clipboard.text.trim();
      let pathname =
        source && source.startsWith("http") ? new URL(source).pathname : source;
      let extension = extname(pathname).slice(1).toLowerCase();
      let file = join(environment.supportPath, `saved-${id}.${extension}`);
      if (!["gif", "png", "jpg", "jpeg", "webp"].includes(extension)) {
        extension = "png";
        file = join(environment.supportPath, `saved-${id}.png`);
        await execFileAsync("/usr/bin/osascript", [
          "-l",
          "JavaScript",
          "-e",
          CLIPBOARD_IMAGE_SCRIPT,
          file,
        ]);
        source = file;
        pathname = file;
      } else if (source.startsWith("http")) {
        const response = await fetch(source);
        if (!response.ok)
          throw new Error(`Download returned ${response.status}`);
        await writeFile(file, Buffer.from(await response.arrayBuffer()));
      } else {
        await copyFile(source, file);
      }

      let item: MediaItem = {
        id,
        provider: "local",
        kind: extension === "gif" ? "gif" : "image",
        title: basename(pathname),
        previewUrl: file,
        mediaUrl: file,
        fileExtension: extension,
      };
      let embeddingError: unknown;
      if (preferences.jinaApiKey) {
        try {
          item = {
            ...item,
            embedding: await createJinaEmbedding(preferences.jinaApiKey, {
              image: await imageInput(file, extension),
            }),
          };
        } catch (error) {
          embeddingError = error;
        }
      }
      const next = [item, ...savedGifs];
      setSavedGifs(next);
      await LocalStorage.setItem(SAVED_GIFS_KEY, JSON.stringify(next));
      toast.style = embeddingError ? Toast.Style.Failure : Toast.Style.Success;
      toast.title = embeddingError
        ? "Saved without semantic indexing"
        : "Saved clipboard media";
      toast.message =
        embeddingError instanceof Error ? embeddingError.message : undefined;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not import media";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  function renderItems(items: MediaItem[], section: string) {
    return items.map((item) => {
      const isSaved = savedGifs.some(
        (saved) => saved.id === item.id && saved.provider === item.provider,
      );
      const label = item.kind === "image" ? "Image" : "GIF";
      return (
        <Grid.Item
          id={`${section}-${item.provider}-${item.kind}-${item.id}`}
          key={`${item.provider}-${item.kind}-${item.id}`}
          content={item.previewUrl}
          keywords={[item.title]}
          actions={
            <ActionPanel>
              <Action
                title={`Copy ${label}`}
                icon={Icon.Clipboard}
                onAction={() => copyMedia(item)}
              />
              <Action
                title={isSaved ? "Remove from Saved" : `Save ${label}`}
                icon={isSaved ? Icon.HeartDisabled : Icon.Heart}
                shortcut={Keyboard.Shortcut.Common.Save}
                onAction={() => toggleSaved(item)}
              />
              <Action
                title={`Paste ${label}`}
                icon={Icon.Message}
                onAction={() => copyMedia(item, true)}
              />
              <Action
                title="Save Clipboard Media"
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd"], key: "v" }}
                onAction={saveClipboardMedia}
              />
              {item.pageUrl ? (
                <Action.OpenInBrowser
                  title={`Open ${label} Page`}
                  url={item.pageUrl}
                />
              ) : null}
            </ActionPanel>
          }
        />
      );
    });
  }

  return (
    <Grid
      columns={5}
      inset={Grid.Inset.Zero}
      fit={Grid.Fit.Fill}
      isLoading={isLoading}
      selectedItemId={selectedItemId}
      onSelectionChange={(id) => setSelectedItemId(id ?? undefined)}
      onSearchTextChange={setQuery}
      actions={
        <ActionPanel>
          <Action
            title="Save Clipboard Media"
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "v" }}
            onAction={saveClipboardMedia}
          />
        </ActionPanel>
      }
      searchBarPlaceholder={
        view === "klipy"
          ? "Search KLIPY"
          : view === "giphy"
            ? "Search GIPHY"
            : "Search Saved"
      }
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="GIF collection"
          value={view}
          onChange={(value) => setView(value as View)}
        >
          <Grid.Dropdown.Item title="KLIPY" value="klipy" />
          <Grid.Dropdown.Item title="GIPHY" value="giphy" />
          <Grid.Dropdown.Item title="Saved" value="saved" icon={Icon.Heart} />
        </Grid.Dropdown>
      }
    >
      {view !== "saved" && !apiKey ? (
        <Grid.EmptyView
          icon={Icon.Key}
          title={`${view === "giphy" ? "GIPHY" : "KLIPY"} API key required`}
          description="Add your API key in the extension preferences."
          actions={
            <ActionPanel>
              <Action
                title="Open Extension Preferences"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
              <Action
                title="Save Clipboard Media"
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd"], key: "v" }}
                onAction={saveClipboardMedia}
              />
            </ActionPanel>
          }
        />
      ) : view === "saved" && visibleGifs.length === 0 ? (
        <Grid.EmptyView
          icon={Icon.Image}
          title={query ? "No matching saved media" : "No saved media"}
          description="Copy an image file or direct image URL, then press Command-V."
          actions={
            <ActionPanel>
              <Action
                title="Save Clipboard Media"
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd"], key: "v" }}
                onAction={saveClipboardMedia}
              />
            </ActionPanel>
          }
        />
      ) : (
        <>
          {matchingSaved.length > 0 ? (
            <Grid.Section title="Matching Saved">
              {renderItems(matchingSaved, "matching")}
            </Grid.Section>
          ) : null}
          <Grid.Section
            title={
              view === "giphy"
                ? "Powered by GIPHY"
                : view === "klipy"
                  ? "KLIPY GIFs"
                  : "Saved"
            }
          >
            {renderItems(visibleGifs, view)}
          </Grid.Section>
          {view === "klipy" && memes.length > 0 ? (
            <Grid.Section title="KLIPY Memes">
              {renderItems(memes, "memes")}
            </Grid.Section>
          ) : null}
        </>
      )}
    </Grid>
  );
}

async function fetchGifs(
  provider: Provider,
  apiKey: string,
  query: string,
  signal: AbortSignal,
): Promise<MediaItem[]> {
  if (provider === "giphy") {
    const endpoint = query ? "search" : "trending";
    const params = new URLSearchParams({
      api_key: apiKey.trim(),
      limit: "30",
      rating: "pg-13",
      bundle: "messaging_non_clips",
    });
    if (query) params.set("q", query);

    const response = await fetch(
      `https://api.giphy.com/v1/gifs/${endpoint}?${params}`,
      { signal },
    );
    if (!response.ok) throw new Error(`GIPHY returned ${response.status}`);
    const json = (await response.json()) as GiphyResponse;
    return json.data.map((gif) => ({
      id: gif.id,
      provider: "giphy",
      kind: "gif",
      title: gif.title,
      previewUrl: gif.images.fixed_width.url,
      mediaUrl: gif.images.original.url,
      fileExtension: "gif",
      pageUrl: gif.url,
    }));
  }

  const endpoint = query ? "search" : "featured";
  const params = new URLSearchParams({
    key: apiKey.trim(),
    limit: "30",
    contentfilter: "medium",
    media_filter: "gif,tinygif",
  });
  if (query) params.set("q", query);

  const response = await fetch(
    `https://api.klipy.com/v2/${endpoint}?${params}`,
    { signal },
  );
  if (!response.ok) throw new Error(`KLIPY returned ${response.status}`);
  const json = (await response.json()) as KlipyResponse;
  return json.results.map((gif) => ({
    id: gif.id,
    provider: "klipy",
    kind: "gif",
    title: gif.title,
    previewUrl: gif.media_formats.tinygif.url,
    mediaUrl: gif.media_formats.gif.url,
    fileExtension: "gif",
    pageUrl: gif.itemurl,
  }));
}

async function fetchKlipyMemes(
  apiKey: string,
  query: string,
  signal: AbortSignal,
): Promise<MediaItem[]> {
  const endpoint = query ? "search" : "trending";
  const params = new URLSearchParams({
    per_page: "30",
    content_filter: "medium",
  });
  if (query) params.set("q", query);

  const response = await fetch(
    `https://api.klipy.com/api/v1/${encodeURIComponent(apiKey.trim())}/static-memes/${endpoint}?${params}`,
    { signal },
  );
  if (!response.ok) throw new Error(`KLIPY memes returned ${response.status}`);
  const json = (await response.json()) as KlipyMemeResponse;
  return json.data.data.map((meme) => ({
    id: String(meme.id),
    provider: "klipy",
    kind: "image",
    title: meme.title,
    previewUrl: meme.file.sm.png.url,
    mediaUrl: meme.file.hd.png.url,
    fileExtension: "png",
  }));
}

async function imageInput(path: string, extension = "png"): Promise<string> {
  if (path.startsWith("http")) return path;
  const mime = extension === "jpg" ? "jpeg" : extension;
  return `data:image/${mime};base64,${(await readFile(path)).toString("base64")}`;
}

async function createJinaEmbedding(
  apiKey: string,
  input: { image: string } | { text: string },
  task?: "retrieval.query",
  signal?: AbortSignal,
): Promise<number[]> {
  const response = await fetch("https://api.jina.ai/v1/embeddings", {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${apiKey.trim()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: JINA_MODEL,
      input: [input],
      dimensions: 256,
      normalized: true,
      embedding_type: "float",
      ...(task ? { task } : {}),
    }),
    signal,
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      `Jina returned ${response.status}${message ? `: ${message.slice(0, 120)}` : ""}`,
    );
  }
  const json = (await response.json()) as {
    data: Array<{ embedding: number[] }>;
  };
  if (!json.data[0]?.embedding) throw new Error("Jina returned no embedding");
  return json.data[0].embedding;
}

function dotProduct(a: number[], b: number[]): number {
  if (a.length !== b.length) return -1;
  return a.reduce((sum, value, index) => sum + value * b[index], 0);
}
