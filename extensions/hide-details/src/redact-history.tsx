import {
  Action,
  ActionPanel,
  Grid,
  Icon,
  Keyboard,
  Toast,
  openExtensionPreferences,
  showHUD,
  showToast,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import {
  clipboardHistoryImageFiles,
  copiedMessage,
  copyRedacted,
  disposeScan,
  historyLabel,
  redactHistoryImage,
  type HistoryImage,
} from "./redaction";
import { Review } from "./review";

function ReviewHistoryImage({ image }: { image: HistoryImage }) {
  const load = useCallback(
    (recognition?: "accurate") => redactHistoryImage(image, { recognition, forReview: true }),
    [image],
  );
  return <Review load={load} target="history" />;
}

async function redactAndCopy(image: HistoryImage) {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Redacting Image" });
  const scan = await redactHistoryImage(image).catch(async (error) => {
    toast.style = Toast.Style.Failure;
    toast.title = "Could Not Redact";
    toast.message = error instanceof Error ? error.message : String(error);
  });
  if (!scan) return;
  try {
    await copyRedacted(scan);
    await showHUD(copiedMessage(scan));
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could Not Copy Image";
    toast.message = error instanceof Error ? error.message : String(error);
  } finally {
    await disposeScan(scan).catch(() => undefined);
  }
}

export default function Command() {
  const [images, setImages] = useState<HistoryImage[] | null>(null);

  const refresh = useCallback(async () => {
    setImages(null);
    setImages(await clipboardHistoryImageFiles());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const refreshAction = (
    <Action
      title="Refresh Clipboard History"
      icon={Icon.ArrowClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={refresh}
    />
  );

  return (
    <Grid columns={3} fit={Grid.Fit.Contain} isLoading={!images} searchBarPlaceholder="Recently copied image files">
      <Grid.EmptyView
        icon={Icon.Clipboard}
        title="No Copied Image Files in Recent History"
        description="Copy an image file in Finder or Explorer, then refresh. Screenshots in history are unavailable; use Redact Clipboard Image for a screenshot currently on the clipboard."
        actions={
          <ActionPanel>
            {refreshAction}
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
      {images?.map((image) => (
        <Grid.Item
          key={image.path}
          content={{ source: image.path }}
          title={historyLabel(image.offset)}
          subtitle={`Modified ${image.modified.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`}
          actions={
            <ActionPanel>
              <Action.Push title="Review Redaction" icon={Icon.Eye} target={<ReviewHistoryImage image={image} />} />
              <Action title="Redact and Copy" icon={Icon.Clipboard} onAction={() => redactAndCopy(image)} />
              {refreshAction}
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
