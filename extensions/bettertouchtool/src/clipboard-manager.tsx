import { Action, ActionPanel, Clipboard, closeMainWindow, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useMemo } from "react";
import { type Btt, type ClipboardManagerItem } from "bettertouchtool";
import { createBttClient } from "./btt";
import { showBttFailureToast } from "./btt-toast";
import { formatClipboardItemDate, getClipboardItemText, getClipboardItemTitle } from "./clipboard-utils";
import { DevelopmentDiagnosticsSection } from "./diagnostics";

const clipboardItemLimit = 200;

export default function Command() {
  const btt = useMemo(createBttClient, []);
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
          <ClipboardItem key={item.meta.uuid} item={item} btt={btt} />
        ))}
      </List.Section>
    </List>
  );
}

function ClipboardItem({ item, btt }: { item: ClipboardManagerItem; btt: Btt }) {
  const text = getClipboardItemText(item);
  const formattedDate = formatClipboardItemDate(item.meta.date);

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

  return (
    <List.Item
      id={item.meta.uuid}
      title={getClipboardItemTitle(item)}
      subtitle={item.meta.copiedFrom}
      icon={Icon.Clipboard}
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
          <DevelopmentDiagnosticsSection />
        </ActionPanel>
      }
    />
  );
}

async function loadClipboardItems(btt: Btt): Promise<ClipboardManagerItem[]> {
  const result = await btt.getItemsFromClipboardManager({ start: 0, numberOfItems: clipboardItemLimit });
  return result.items;
}
