import { type Detail, Icon, type Image } from "@raycast/api";
import type { QRProps } from "qrdx";
import { getFrameText } from "qrdx";
import { frameName } from "./frames";
import type { QRRenderProps } from "./qr-engine";
import { templateName, toLabel } from "./types";

const HEX_COLOR = /^#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i;

/** A color as text: a hex color or a gradient's JSON. */
function colorText(color: QRProps["fgColor"]): string {
  return typeof color === "string" ? color : JSON.stringify(color);
}

/** A swatch of a hex color, in that exact color in both themes. */
function swatch(color: QRProps["fgColor"]): Image.ImageLike | undefined {
  if (typeof color !== "string" || !HEX_COLOR.test(color)) return;
  return {
    source: Icon.CircleFilled,
    tintColor: { light: color, dark: color, adjustContrast: false },
  };
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * The settings a code is drawn with, as the metadata of a Detail
 * (`Detail.Metadata`) or of a list's detail pane (`List.Item.Detail.Metadata`,
 * the same component). `savedAt` adds the date a saved code was saved.
 */
export function QRMetadata({
  Metadata,
  qrProps,
  savedAt,
}: {
  Metadata: typeof Detail.Metadata;
  qrProps: QRRenderProps;
  savedAt?: number;
}) {
  const frame = qrProps.frame && qrProps.frame.style !== "custom" ? qrProps.frame : undefined;

  function color(title: string, value: QRProps["fgColor"]) {
    return <Metadata.Label icon={swatch(value)} text={colorText(value)} title={title} />;
  }

  return (
    <Metadata>
      <Metadata.Label text={qrProps.value} title="Data" />
      <Metadata.Separator />
      <Metadata.Label text={toLabel(qrProps.bodyPattern ?? "square")} title="Body" />
      <Metadata.Label text={toLabel(qrProps.cornerEyePattern ?? "square")} title="Corner Eye" />
      <Metadata.Label text={toLabel(qrProps.cornerEyeDotPattern ?? "square")} title="Corner Dot" />
      <Metadata.Separator />
      {frame ? (
        <>
          <Metadata.Label text={frameName(frame.style)} title="Frame" />
          <Metadata.Label text={getFrameText(frame) || "None"} title="Frame Label" />
          {frame.color ? color("Frame Color", frame.color) : null}
          {frame.textColor ? color("Label Color", frame.textColor) : null}
        </>
      ) : qrProps.templateId ? (
        // A code saved with a template, before frames
        <Metadata.Label text={templateName(qrProps.templateId)} title="Template" />
      ) : (
        <Metadata.Label text={frameName(undefined)} title="Frame" />
      )}
      <Metadata.Separator />
      {color("Foreground", qrProps.fgColor)}
      {color("Background", qrProps.bgColor)}
      {qrProps.eyeColor ? color("Eye Color", qrProps.eyeColor) : null}
      {qrProps.dotColor ? color("Dot Color", qrProps.dotColor) : null}
      <Metadata.Separator />
      {qrProps.imageSettings?.src ? <Metadata.Label text={qrProps.imageSettings.src} title="Logo" /> : null}
      <Metadata.Label text={qrProps.level ?? "Q"} title="Error Correction" />
      <Metadata.Label text={`${qrProps.size} px`} title="Size" />
      {qrProps.margin ? <Metadata.Label text={String(qrProps.margin)} title="Quiet Zone" /> : null}
      {savedAt ? (
        <>
          <Metadata.Separator />
          <Metadata.Label text={formatDate(savedAt)} title="Saved" />
        </>
      ) : null}
    </Metadata>
  );
}
