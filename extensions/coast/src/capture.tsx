import { pathToFileURL } from "node:url";
import {
  Action,
  ActionPanel,
  Clipboard,
  Icon,
  List,
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

export function CaptureDetailPane({ capture }: { capture: CaptureDetail }) {
  const [imagePath, setImagePath] = useState<string>();
  const [imageError, setImageError] = useState<string>();

  useEffect(() => {
    let active = true;
    setImagePath(undefined);
    setImageError(undefined);
    getCaptureImage(capture.frame_id)
      .then((path) => active && setImagePath(path))
      .catch((error) => {
        if (active) {
          setImageError(error instanceof Error ? error.message : String(error));
        }
      });
    return () => {
      active = false;
    };
  }, [capture.frame_id]);

  const markdown = imagePath
    ? `![Capture](${pathToFileURL(imagePath).href})`
    : imageError
      ? "Screenshot unavailable. Open the inspector to retry, or choose Show OCR there."
      : "";

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
