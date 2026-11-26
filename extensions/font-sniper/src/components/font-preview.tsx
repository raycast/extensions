import { ActionPanel, Detail } from "@raycast/api";
import { useEffect, useState } from "react";
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
  const [preview, setPreview] =
    useState<Awaited<ReturnType<typeof loadFontPreview>>>();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setPreview(undefined);
    setFailed(false);
    loadFontPreview(font, pageUrl, controller.signal).then(
      (result) => {
        if (!controller.signal.aborted) setPreview(result);
      },
      () => {
        if (!controller.signal.aborted) setFailed(true);
      },
    );
    return () => controller.abort();
  }, [font, pageUrl]);

  return (
    <Detail
      navigationTitle={getFontDisplayName(font)}
      isLoading={!preview && !failed}
      markdown={
        preview
          ? `![Font sample](${preview.image})`
          : failed
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
