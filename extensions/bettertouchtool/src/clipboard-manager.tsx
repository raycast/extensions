import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  closeMainWindow,
  confirmAlert,
  getPreferenceValues,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { getFavicon, runAppleScript, showFailureToast, usePromise } from "@raycast/utils";
import { useMemo } from "react";
import { type Btt, type ClipboardManagerItem } from "bettertouchtool";
import { createBttClient } from "./btt";
import { showBttFailureToast } from "./btt-toast";
import {
  formatClipboardItemDate,
  getClipboardItemColor,
  getClipboardItemFilePath,
  getClipboardItemShellCommand,
  getClipboardItemText,
  getClipboardItemTitle,
  getClipboardItemUrl,
  parseClipboardCommandWhitelist,
} from "./clipboard-utils";
import { DevelopmentDiagnosticsSection } from "./diagnostics";

const clipboardItemLimit = 200;

export default function Command() {
  const btt = useMemo(createBttClient, []);
  const { clipboardCommandWhitelist } = getPreferenceValues<ClipboardPreferences>();
  const customShellExecutables = useMemo(
    () => parseClipboardCommandWhitelist(clipboardCommandWhitelist),
    [clipboardCommandWhitelist],
  );
  const {
    isLoading,
    data = [],
    revalidate,
  } = usePromise(loadClipboardItems, [btt], {
    failureToastOptions: { title: "Could not load the BTT clipboard" },
  });

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search the BTT clipboard..."
      throttle
      actions={
        <ActionPanel>
          <Action
            title="Refresh Clipboard"
            onAction={revalidate}
            icon={Icon.RotateClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
          />
          <DevelopmentDiagnosticsSection />
        </ActionPanel>
      }
    >
      <List.Section title="Recent Clipboard Items" subtitle={String(data.length)}>
        {data.map((item) => (
          <ClipboardItem key={item.meta.uuid} item={item} btt={btt} customShellExecutables={customShellExecutables} />
        ))}
      </List.Section>
    </List>
  );
}

function ClipboardItem({
  item,
  btt,
  customShellExecutables,
}: {
  item: ClipboardManagerItem;
  btt: Btt;
  customShellExecutables: ReadonlySet<string>;
}) {
  const text = getClipboardItemText(item);
  const formattedDate = formatClipboardItemDate(item.meta.date);
  const color = getClipboardItemColor(item);
  const url = getClipboardItemUrl(item);
  const filePath = getClipboardItemFilePath(item);
  const shellCommand = getClipboardItemShellCommand(item, customShellExecutables);
  const icon = color
    ? { source: Icon.CircleFilled, tintColor: color }
    : url
      ? getFavicon(url, { fallback: Icon.Link })
      : filePath
        ? { fileIcon: filePath }
        : shellCommand
          ? Icon.Terminal
          : Icon.Clipboard;

  async function pasteItem() {
    await closeMainWindow();
    try {
      await btt.pasteClipboardManagerItems([item.meta.uuid]);
      await showToast({ title: "Clipboard item pasted", style: Toast.Style.Success });
    } catch (error) {
      await showBttFailureToast(error, "Could not paste clipboard item");
    }
  }

  async function copyItem() {
    try {
      await Clipboard.copy(text);
      await showToast({ title: "Clipboard item copied", style: Toast.Style.Success });
    } catch (error) {
      await showBttFailureToast(error, "Could not copy clipboard item");
    }
  }

  async function pasteIntoTerminal() {
    if (!shellCommand) return;

    try {
      await Clipboard.copy(shellCommand);
      await closeMainWindow();
      await runAppleScript(`
        tell application "Terminal" to activate
        delay 0.2
        tell application "System Events" to keystroke "v" using command down
      `);
    } catch (error) {
      await showFailureToast(error, { title: "Could not paste command into Terminal" });
    }
  }

  async function runInTerminal() {
    if (!shellCommand) return;

    const confirmed = await confirmAlert({
      title: "Run this command in Terminal?",
      message: `This opens a new Terminal window and executes:\n\n${shellCommand}`,
      icon: Icon.Terminal,
      primaryAction: { title: "Run Command", style: Alert.ActionStyle.Default },
    });
    if (!confirmed) return;

    try {
      await closeMainWindow();
      await runAppleScript(
        `
          on run argv
            tell application "Terminal"
              activate
              do script (item 1 of argv)
            end tell
          end run
        `,
        [shellCommand],
      );
    } catch (error) {
      await showFailureToast(error, { title: "Could not run command in Terminal" });
    }
  }

  return (
    <List.Item
      id={item.meta.uuid}
      title={getClipboardItemTitle(item)}
      subtitle={item.meta.copiedFrom}
      icon={icon}
      keywords={[text, item.meta.previewText, item.meta.copiedFrom].filter((value): value is string => Boolean(value))}
      accessories={[...(formattedDate ? [{ text: formattedDate }] : [])]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action title="Paste with BTT" onAction={pasteItem} icon={Icon.Clipboard} />
            {text ? (
              <Action
                title="Copy to Clipboard"
                onAction={copyItem}
                icon={Icon.CopyClipboard}
                shortcut={Keyboard.Shortcut.Common.Copy}
              />
            ) : null}
          </ActionPanel.Section>
          {url || filePath || shellCommand ? (
            <ActionPanel.Section>
              {url ? <Action.OpenInBrowser url={url} /> : null}
              {filePath ? <Action.Open title="Open File or Folder" target={filePath} /> : null}
              {filePath ? <Action.ShowInFinder path={filePath} /> : null}
              {shellCommand ? (
                <Action title="Paste into Terminal" onAction={pasteIntoTerminal} icon={Icon.Terminal} />
              ) : null}
              {shellCommand ? <Action title="Run in Terminal…" onAction={runInTerminal} icon={Icon.Play} /> : null}
            </ActionPanel.Section>
          ) : null}
          <DevelopmentDiagnosticsSection />
        </ActionPanel>
      }
    />
  );
}

interface ClipboardPreferences {
  clipboardCommandWhitelist?: string;
}

async function loadClipboardItems(btt: Btt): Promise<ClipboardManagerItem[]> {
  const result = await btt.getItemsFromClipboardManager({ start: 0, numberOfItems: clipboardItemLimit });
  return result.items;
}
