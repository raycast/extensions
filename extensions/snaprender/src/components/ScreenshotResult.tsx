import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Icon,
  Keyboard,
  Toast,
  showHUD,
  showInFinder,
  showToast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { ScreenshotOptions } from "../lib/api";
import { copyToDownloads, errorMessage, getClient, saveToSupport, showError } from "../lib/raycast";
import { DEVICE_TITLES, FORMAT_TITLES } from "../lib/labels";

interface Capture {
  filePath: string;
  bytes: number;
  remainingCredits?: number;
}

async function capture(options: ScreenshotOptions): Promise<Capture> {
  const shot = await getClient().screenshot(options);
  const filePath = await saveToSupport(options.url, shot);
  return { filePath, bytes: shot.data.length, remainingCredits: shot.remainingCredits };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function ScreenshotResult({ options }: { options: ScreenshotOptions }) {
  const format = options.format ?? "png";
  const isPdf = format === "pdf";
  const { data, isLoading, error, revalidate } = usePromise(capture, [options], {
    onError: (err) => showError("Screenshot failed", err),
  });

  let markdown: string;
  if (isLoading) {
    markdown = `Capturing **${options.url}** ...`;
  } else if (error) {
    markdown = `## Screenshot failed\n\n${errorMessage(error)}\n\nPress **Enter** to try again.`;
  } else if (data && isPdf) {
    markdown = `## PDF ready\n\nThe PDF of **${options.url}** is saved. Use the actions to open it, save it to Downloads or copy it.`;
  } else if (data) {
    markdown = `![Screenshot of ${options.url}](${encodeURI(`file://${data.filePath}`)})`;
  } else {
    markdown = "";
  }

  const copySignedUrl = async () => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Creating signed URL" });
    try {
      const signed = await getClient().signUrl(options);
      await Clipboard.copy(signed.signed_url);
      toast.style = Toast.Style.Success;
      toast.title = "Signed URL copied";
      toast.message = `Valid until ${new Date(signed.expires_at).toLocaleString()}. Each open renders a new capture.`;
    } catch (err) {
      await toast.hide();
      await showError("Could not create signed URL", err);
    }
  };

  const saveToDownloads = async (filePath: string) => {
    try {
      const target = await copyToDownloads(filePath);
      await showToast({
        style: Toast.Style.Success,
        title: "Saved to Downloads",
        message: target.split("/").pop(),
        primaryAction: { title: "Show in Finder", onAction: () => showInFinder(target) },
      });
    } catch (err) {
      await showError("Could not save file", err);
    }
  };

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle="Screenshot"
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Link title="URL" target={options.url} text={options.url} />
          <Detail.Metadata.Label title="Device" text={DEVICE_TITLES[options.device ?? "desktop"]} />
          <Detail.Metadata.Label title="Format" text={FORMAT_TITLES[format]} />
          <Detail.Metadata.Label title="Full Page" text={options.fullPage ? "Yes" : "No"} />
          <Detail.Metadata.Label title="Dark Mode" text={options.darkMode ? "Yes" : "No"} />
          {data ? (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.Label title="File Size" text={formatBytes(data.bytes)} />
              {data.remainingCredits !== undefined ? (
                <Detail.Metadata.Label title="Captures Left" text={data.remainingCredits.toLocaleString("en-US")} />
              ) : null}
            </>
          ) : null}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {data ? (
            <>
              <ActionPanel.Section>
                <Action
                  title={isPdf ? "Copy File to Clipboard" : "Copy Image to Clipboard"}
                  icon={Icon.Clipboard}
                  onAction={async () => {
                    await Clipboard.copy({ file: data.filePath });
                    await showHUD(isPdf ? "PDF copied" : "Screenshot copied");
                  }}
                />
                <Action
                  title="Save to Downloads"
                  icon={Icon.Download}
                  onAction={() => saveToDownloads(data.filePath)}
                />
                <Action.Open
                  title="Open File"
                  target={data.filePath}
                  icon={Icon.Eye}
                  shortcut={Keyboard.Shortcut.Common.Open}
                />
                <Action.ShowInFinder path={data.filePath} shortcut={{ modifiers: ["cmd", "shift"], key: "f" }} />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action
                  title="Copy Signed URL"
                  icon={Icon.Link}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                  onAction={copySignedUrl}
                />
                <Action.OpenInBrowser title="Open Page in Browser" url={options.url} />
                <Action
                  title="Capture Again"
                  icon={Icon.ArrowClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={revalidate}
                />
              </ActionPanel.Section>
            </>
          ) : (
            <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={revalidate} />
          )}
        </ActionPanel>
      }
    />
  );
}
