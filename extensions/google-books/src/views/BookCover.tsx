import { Action, ActionPanel, Clipboard, Detail, Icon, Keyboard, showInFinder, showToast, Toast } from "@raycast/api";
import { VolumeItem } from "../types/google-books.dt";
import { getLargeCover } from "../utils/books";
import { writeFile } from "fs/promises";
import { homedir, tmpdir } from "os";
import { join } from "path";

async function fetchCoverBuffer(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch cover: ${response.status} ${response.statusText}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

export function BookCover({ item }: { item: VolumeItem }) {
  const cover = getLargeCover(item);
  const markdown = cover ? `# ![Cover](${cover})` : `# No cover available.`;
  const safeName = (item.volumeInfo?.title ?? "cover").replace(/[^a-zA-Z0-9]/g, "_").substring(0, 60);

  return (
    <Detail
      navigationTitle="Cover"
      markdown={markdown}
      actions={
        <ActionPanel>
          {cover && (
            <ActionPanel.Section>
              <Action
                icon={Icon.Download}
                title="Download Cover"
                onAction={async () => {
                  try {
                    const buffer = await fetchCoverBuffer(cover);
                    const filePath = join(homedir(), "Downloads", `${safeName}_cover.jpg`);
                    await writeFile(filePath, buffer);
                    const toast = await showToast({
                      style: Toast.Style.Success,
                      title: "Cover Downloaded Successfully",
                      message: filePath,
                    });
                    toast.primaryAction = {
                      title: "Reveal in Finder",
                      onAction: () => showInFinder(filePath),
                    };
                  } catch {
                    await showToast({
                      style: Toast.Style.Failure,
                      title: "Download Failed",
                      message: "Could not download the cover image.",
                    });
                  }
                }}
              />
              <Action
                icon={Icon.Clipboard}
                title="Copy Cover"
                shortcut={Keyboard.Shortcut.Common.Copy}
                onAction={async () => {
                  try {
                    const buffer = await fetchCoverBuffer(cover);
                    const tempPath = join(tmpdir(), `raycast-google-books-${item.id}.jpg`);
                    await writeFile(tempPath, buffer);
                    await Clipboard.copy({ file: tempPath });
                    await showToast({
                      style: Toast.Style.Success,
                      title: "Cover Copied to Clipboard",
                    });
                  } catch {
                    await showToast({
                      style: Toast.Style.Failure,
                      title: "Copy Failed",
                      message: "Could not copy the cover image.",
                    });
                  }
                }}
              />
              <Action.CopyToClipboard
                icon={Icon.Link}
                title="Copy Cover URL"
                content={cover}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
            </ActionPanel.Section>
          )}
          {(item.volumeInfo?.infoLink || item.selfLink) && (
            <ActionPanel.Section>
              <Action.OpenInBrowser url={item.volumeInfo?.infoLink ?? item.selfLink} />
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    />
  );
}
