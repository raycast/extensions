import { Detail } from "@raycast/api";
import { ReactNode } from "react";
import { SITE_URL, TILE_META } from "./tiles";
import { encodeFileUri, preferredTileUrl, tileLetter } from "./url";

type LandsatDetailProps = {
  displayName: string;
  filePath?: string;
  tileIds: string[];
  isLoading?: boolean;
  error?: string | null;
  actions: ReactNode;
};

const DETAIL_IMG_HEIGHT = 300;

function buildMarkdown(displayName: string, filePath: string | undefined, error: string | null | undefined): string {
  if (error) return `**Error:** ${error}`;
  if (!filePath) return "Generating…";
  return `<img src="${encodeFileUri(filePath)}" alt="${displayName}" height="${DETAIL_IMG_HEIGHT}" />`;
}

export function LandsatDetail({ displayName, filePath, tileIds, isLoading, error, actions }: LandsatDetailProps) {
  return (
    <Detail
      isLoading={isLoading}
      markdown={buildMarkdown(displayName, filePath, error)}
      navigationTitle={displayName ? `Landsat: ${displayName}` : "Landsat"}
      metadata={
        filePath && !error ? (
          <Detail.Metadata>
            {tileIds.map((id, i) => {
              const meta = TILE_META[id];
              const letter = tileLetter(id);
              const line = meta ? `${letter} — ${meta.title}` : `${letter} — ${id}`;
              const url = preferredTileUrl(meta);
              if (url) return <Detail.Metadata.Link key={`${id}-${i}`} title="" target={url} text={line} />;
              return <Detail.Metadata.Label key={`${id}-${i}`} title="" text={line} />;
            })}
            <Detail.Metadata.Separator />
            <Detail.Metadata.Link title="Landsat Mission" target={SITE_URL} text="science.nasa.gov" />
          </Detail.Metadata>
        ) : undefined
      }
      actions={actions}
    />
  );
}
