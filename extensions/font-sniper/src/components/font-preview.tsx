import { ActionPanel, Detail } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useRef } from "react";
import type { FontInfo } from "../types";
import { getFontDisplayName } from "../utils/fontActions";
import { loadFontPreview } from "../utils/fontPreview";
import { FontActions } from "./font-actions";

export function FontPreview({
  font,
  pageUrl,
}: {
  font: FontInfo;
  pageUrl: string;
}) {
  const abortable = useRef<AbortController | null>(null);
  const { data, error, isLoading } = usePromise(
    (face: FontInfo, url: string) =>
      loadFontPreview(face, url, abortable.current?.signal),
    [font, pageUrl],
    { abortable, onError: () => {} },
  );
  const preview = error ? undefined : data;

  return (
    <Detail
      navigationTitle={getFontDisplayName(font)}
      isLoading={isLoading}
      markdown={
        preview
          ? `![Font sample](${preview.image})`
          : error
            ? "## Preview Unavailable\n\nThe font could not be loaded or its outlines are unsupported."
            : ""
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Font Family"
            text={preview?.family || font.family}
          />
          {preview && preview.family !== font.family && (
            <Detail.Metadata.Label title="CSS Family" text={font.family} />
          )}
          {preview?.subfamily && (
            <Detail.Metadata.Label title="Typeface" text={preview.subfamily} />
          )}
          <Detail.Metadata.Label
            title="CSS Weight"
            text={font.weight || "Regular"}
          />
          <Detail.Metadata.Label
            title="CSS Style"
            text={font.style || "normal"}
          />
          <Detail.Metadata.Label
            title="Source Format"
            text={font.format.toUpperCase()}
          />
          {preview && (
            <Detail.Metadata.Label
              title="Glyphs"
              text={String(preview.glyphCount)}
            />
          )}
          {preview && (
            <Detail.Metadata.Label
              title="Units Per Em"
              text={String(preview.unitsPerEm)}
            />
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <FontActions font={font} family={preview?.family} />
        </ActionPanel>
      }
    />
  );
}
