import {
  Action,
  ActionPanel,
  Clipboard,
  Grid,
  environment,
  Icon,
  showHUD,
} from "@raycast/api";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { useEffect, useState } from "react";

import { FACE_TAGS, FaceTag, faces } from "./faces";

const TILE_VERSION = "v4";

async function copyFace(face: string) {
  await Clipboard.copy(face);
  await showHUD(`Copied ${face}`);
}

function faceFontSize(face: string) {
  const compact = face.replace(/\s/g, "");

  if (compact.length <= 3) {
    return 180;
  }

  if (compact.length <= 6) {
    return 150;
  }

  if (compact.length <= 10) {
    return 128;
  }

  return 108;
}

function faceTileSvg(face: string) {
  const fontSize = faceFontSize(face);

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="600" height="380" viewBox="0 0 600 380">
      <text
        x="300"
        y="190"
        text-anchor="middle"
        dominant-baseline="middle"
        font-family="'Hiragino Sans', 'SF Pro Rounded', sans-serif"
        font-size="${fontSize}"
        fill="#FFFFFF"
      >${face.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</text>
    </svg>
  `;
}

function titleCase(tag: FaceTag) {
  return tag.charAt(0).toUpperCase() + tag.slice(1);
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [selectedTag, setSelectedTag] = useState<FaceTag>("all");
  const [tileSources, setTileSources] = useState<Record<string, string>>({});

  useEffect(() => {
    let isCancelled = false;

    async function ensureTiles() {
      const tilesDir = join(
        environment.supportPath,
        `face-tiles-${TILE_VERSION}`,
      );
      await mkdir(tilesDir, { recursive: true });

      const entries = await Promise.all(
        faces.map(async (face, index) => {
          const filename = `face-${String(index + 1).padStart(2, "0")}.svg`;
          const filePath = join(tilesDir, filename);
          await writeFile(filePath, faceTileSvg(face.value), "utf8");
          return [face.value, filePath] as const;
        }),
      );

      if (!isCancelled) {
        setTileSources(Object.fromEntries(entries));
      }
    }

    ensureTiles().catch((error) => {
      console.error("Failed to prepare face tiles", error);
    });

    return () => {
      isCancelled = true;
    };
  }, []);

  const query = searchText.trim().toLowerCase();
  const filteredFaces = faces.filter((face) => {
    const matchesTag = selectedTag === "all" || face.tags.includes(selectedTag);

    if (!matchesTag) {
      return false;
    }

    if (!query) {
      return true;
    }

    const haystack = [face.value, ...face.tags, ...(face.keywords ?? [])]
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });

  return (
    <Grid
      columns={4}
      aspectRatio="16/9"
      fit={Grid.Fit.Fill}
      inset={Grid.Inset.Medium}
      searchBarPlaceholder="Search by face or mood"
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Filter by mood"
          storeValue
          onChange={(value) => setSelectedTag(value as FaceTag)}
        >
          {FACE_TAGS.map((tag) => (
            <Grid.Dropdown.Item key={tag} title={titleCase(tag)} value={tag} />
          ))}
        </Grid.Dropdown>
      }
      throttle
    >
      {filteredFaces.map((face) => (
        <Grid.Item
          key={face.value}
          content={{ source: tileSources[face.value] ?? Icon.FaceSmile }}
          keywords={[...face.tags, ...(face.keywords ?? [])]}
          accessory={{
            text: face.tags.filter((tag) => tag !== "all").join(" · "),
          }}
          actions={
            <ActionPanel>
              <Action
                title="Copy Face"
                icon={Icon.Clipboard}
                onAction={() => copyFace(face.value)}
              />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
