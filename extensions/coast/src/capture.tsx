import { pathToFileURL } from "node:url";
import {
  Action,
  ActionPanel,
  Clipboard,
  Icon,
  List,
  getPreferenceValues,
  open,
  showHUD,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  createCoastLink,
  getCaptureImage,
  type CaptureDetail,
  type TimelineArgs,
} from "./coast";
import { aroundMoment, readableTime } from "./dates";
import { Inspector, MomentsView } from "./explore";
import { PreviewCache } from "./preview-cache";

const previews = new PreviewCache();
const previewHeight = 220;

export function CaptureDetailPane({ capture }: { capture: CaptureDetail }) {
  const source =
    getPreferenceValues<Preferences>().coastPath?.trim() || "coast";
  const key = JSON.stringify([source, capture.frame_id]);
  const [result, setResult] = useState<{
    key: string;
    path?: string;
    error?: string;
  }>();
  // Selection identity prevents a previous frame appearing with new metadata.
  const imagePath =
    previews.get(key) || (result?.key === key ? result.path : undefined);
  const imageError = result?.key === key ? result.error : undefined;

  useEffect(() => {
    let active = true;
    setResult(undefined);
    previews
      .load(key, () => getCaptureImage(capture.frame_id))
      .then((path) => active && setResult({ key, path }))
      .catch((error) => {
        if (active) {
          setResult({
            key,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      });
    return () => {
      active = false;
    };
  }, [key, capture.frame_id]);

  const markdown = imagePath
    ? `![Capture](${pathToFileURL(imagePath).href}?raycast-height=${previewHeight})`
    : imageError
      ? "Screenshot unavailable. Open the inspector to retry, or choose Show OCR there."
      : `![](preview-space.svg?raycast-height=${previewHeight})`;

  return (
    <List.Item.Detail
      isLoading={!imagePath && !imageError}
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Time"
            text={readableTime(capture.timestamp, true)}
          />
          <List.Item.Detail.Metadata.Label
            title="Application"
            text={capture.application}
          />
          {capture.domain ? (
            <List.Item.Detail.Metadata.Label
              title="Domain"
              text={capture.domain}
            />
          ) : null}
          <List.Item.Detail.Metadata.Label
            title="Frame ID"
            text={String(capture.frame_id)}
          />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

export function CaptureActions({
  capture,
  frames,
  scope,
  children,
}: {
  capture: CaptureDetail;
  frames?: CaptureDetail[];
  scope?: Partial<TimelineArgs>;
  children?: Parameters<typeof ActionPanel>[0]["children"];
}) {
  async function openInCoast() {
    const link = await createCoastLink(capture.timestamp);
    await open(link);
  }

  async function copyScreenshot() {
    const path = await getCaptureImage(capture.frame_id);
    await Clipboard.copy({ file: path });
    await showHUD("Copied Coast screenshot");
  }

  async function openScreenshot() {
    const path = await getCaptureImage(capture.frame_id);
    await open(path);
  }

  return (
    <ActionPanel>
      <Action.Push
        title="Inspect Moment"
        icon={Icon.Eye}
        target={<Inspector capture={capture} frames={frames} scope={scope} />}
      />
      <ActionPanel.Submenu
        title="Explore Around This Moment…"
        icon={Icon.Clock}
      >
        {[2, 5, 15].map((minutes) => (
          <Action.Push
            key={minutes}
            title={`${minutes} Minutes Before and After`}
            target={
              <MomentsView
                scope={{
                  ...scope,
                  tr: aroundMoment(capture.timestamp, minutes),
                }}
              />
            }
          />
        ))}
      </ActionPanel.Submenu>
      <Action
        title="Copy Evidence"
        icon={Icon.Clipboard}
        onAction={async () => {
          const link = await createCoastLink(capture.timestamp);
          await Clipboard.copy(
            `${capture.title || capture.application}\n${readableTime(capture.timestamp, true)} · ${capture.application}\n${link}`,
          );
          await showHUD("Copied evidence");
        }}
      />
      <Action title="Open in Coast" icon={Icon.Clock} onAction={openInCoast} />
      {capture.url ? <Action.OpenInBrowser url={capture.url} /> : null}
      {/* Preserve standard acronyms rather than the linter's "Ocr" / "Id" suggestions. */}
      {/* eslint-disable @raycast/prefer-title-case */}
      <Action.CopyToClipboard
        title="Copy OCR Text"
        content={capture.ocr_text || ""}
        shortcut={{ modifiers: ["cmd"], key: "c" }}
      />
      {/* eslint-enable @raycast/prefer-title-case */}
      <Action
        title="Copy Screenshot"
        icon={Icon.Clipboard}
        onAction={copyScreenshot}
      />
      <Action
        title="Open Screenshot"
        icon={Icon.Image}
        onAction={openScreenshot}
      />
      {/* eslint-disable @raycast/prefer-title-case */}
      <Action.CopyToClipboard
        title="Copy Frame ID"
        content={String(capture.frame_id)}
      />
      {/* eslint-enable @raycast/prefer-title-case */}
      {children}
    </ActionPanel>
  );
}
