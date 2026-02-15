import {
  Action,
  ActionPanel,
  Icon,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { FilePicker } from "./components/FilePicker";
import { TextToFileForm } from "./components/TextToFileForm";
import { buildAppendRequest } from "./lib/append-request";
import {
  readClipboardHistory,
  type ClipboardHistoryItem,
} from "./lib/clipboard";

export default function Command() {
  const { push } = useNavigation();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [historyItems, setHistoryItems] = useState<ClipboardHistoryItem[]>([]);

  const loadHistory = useCallback(async () => {
    setIsLoading(true);

    try {
      const items = await readClipboardHistory();
      setHistoryItems(items);
    } catch (error) {
      setHistoryItems([]);
      const message =
        error instanceof Error
          ? error.message
          : "Unable to read clipboard history.";
      await showToast({
        style: Toast.Style.Failure,
        title: "Clipboard history failed",
        message,
        primaryAction: {
          title: "Open Extension Preferences",
          onAction: () => {
            void openExtensionPreferences();
          },
        },
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const openFilePicker = useCallback(
    (item: ClipboardHistoryItem) => {
      push(
        <FilePicker
          request={buildAppendRequest(item.text)}
          navigationTitle="Append Text from Clipboard to File"
        />,
      );
    },
    [push],
  );

  const openEditor = useCallback(
    (item?: ClipboardHistoryItem) => {
      push(
        <TextToFileForm
          navigationTitle="Edit Clipboard Text"
          submitTitle="Choose File"
          initialText={item?.text}
          showInsertPosition
        />,
      );
    },
    [push],
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      navigationTitle="Append Text from Clipboard to File"
      searchBarPlaceholder="Search clipboard history..."
    >
      {historyItems.map((item) => (
        <List.Item
          key={item.offset}
          title={item.snippet || "(empty)"}
          icon={Icon.Clipboard}
          detail={<List.Item.Detail markdown={item.text} />}
          actions={
            <ActionPanel>
              <Action
                title="Choose File and Append"
                onAction={() => openFilePicker(item)}
              />
              <Action
                title="Edit Then Choose File"
                onAction={() => openEditor(item)}
              />
              <Action
                title="Refresh Clipboard History"
                icon={Icon.ArrowClockwise}
                onAction={() => void loadHistory()}
              />
            </ActionPanel>
          }
        />
      ))}

      {!isLoading && historyItems.length === 0 ? (
        <List.EmptyView
          icon={Icon.Clipboard}
          title="No Clipboard Items"
          description="Copy some text and refresh clipboard history."
          actions={
            <ActionPanel>
              <Action
                title="Refresh Clipboard History"
                onAction={() => void loadHistory()}
              />
              <Action
                title="Write Text Manually"
                onAction={() => openEditor()}
              />
              <Action
                title="Open Extension Preferences"
                icon={Icon.Gear}
                onAction={() => {
                  void openExtensionPreferences();
                }}
              />
            </ActionPanel>
          }
        />
      ) : null}
    </List>
  );
}
