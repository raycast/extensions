import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnalyzeView } from "./AnalyzeView";
import {
  readSavedResults,
  removeSavedResult,
  savedResultKindLabel,
  savedResultPrimaryText,
  type SavedResult,
} from "./lib/saved-results";

export default function Command() {
  const [items, setItems] = useState<SavedResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(() => {
    setIsLoading(true);
    void readSavedResults()
      .then(setItems)
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const deleteItem = useCallback(async (item: SavedResult) => {
    const confirmed = await confirmAlert({
      title: "Delete Saved Result?",
      message: item.title,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;
    await removeSavedResult(item.id);
    setItems((current) => current.filter((entry) => entry.id !== item.id));
    await showToast({
      style: Toast.Style.Success,
      title: "Deleted",
      message: item.title,
    });
  }, []);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={items.length > 0}
      searchBarPlaceholder="Search saved expressions and analyses..."
    >
      {items.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No Saved Results"
          description="Save an expression or analysis from its Action Panel."
          icon={Icon.Pin}
        />
      ) : null}
      {items.map((item) => (
        <SavedResultItem
          key={item.id}
          item={item}
          onDelete={() => void deleteItem(item)}
        />
      ))}
    </List>
  );
}

function SavedResultItem({
  item,
  onDelete,
}: {
  item: SavedResult;
  onDelete: () => void;
}) {
  const primary = savedResultPrimaryText(item);
  const practiceText = useMemo(() => {
    if (item.kind === "analysis") return item.sourceText;
    if (item.targetLanguageTitle && item.targetLanguageTitle !== "English") {
      return null;
    }
    return item.outputText ?? item.sourceText;
  }, [item]);

  return (
    <List.Item
      icon={iconForKind(item.kind)}
      title={item.title}
      subtitle={primary}
      accessories={[
        { text: savedResultKindLabel(item.kind) },
        { date: new Date(item.updatedAt) },
      ]}
      detail={
        <List.Item.Detail
          markdown={item.markdown}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label
                title="Type"
                text={savedResultKindLabel(item.kind)}
              />
              <List.Item.Detail.Metadata.Label
                title="Saved"
                text={formatDate(item.updatedAt)}
              />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="Provider"
                text={item.providerTitle ?? item.provider}
              />
              <List.Item.Detail.Metadata.Label
                title="Model"
                text={item.model}
              />
              {item.targetLanguageTitle ? (
                <List.Item.Detail.Metadata.Label
                  title="Target"
                  text={item.targetLanguageTitle}
                />
              ) : null}
              {item.tone ? (
                <List.Item.Detail.Metadata.Label
                  title="Tone"
                  text={item.tone}
                />
              ) : null}
              {item.ttsProvider || item.ttsModel || item.ttsVoice ? (
                <List.Item.Detail.Metadata.Separator />
              ) : null}
              {item.ttsProvider ? (
                <List.Item.Detail.Metadata.Label
                  title="Voice Provider"
                  text={item.ttsProviderTitle ?? item.ttsProvider}
                />
              ) : null}
              {item.ttsModel ? (
                <List.Item.Detail.Metadata.Label
                  title="Voice Model"
                  text={item.ttsModel}
                />
              ) : null}
              {item.ttsVoice ? (
                <List.Item.Detail.Metadata.Label
                  title="Voice"
                  text={item.ttsVoice}
                />
              ) : null}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Saved Result">
            {practiceText ? (
              <Action.Push
                title="Practice This English"
                icon={Icon.Microphone}
                target={<AnalyzeView text={practiceText} />}
              />
            ) : null}
            <Action.CopyToClipboard
              title="Copy Result"
              content={primary}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy Full Note"
              content={item.markdown}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
            <Action.CreateSnippet
              title="Create Raycast Snippet"
              icon={Icon.Text}
              snippet={{ name: item.title, text: primary }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Manage">
            <Action
              title="Delete Saved Result"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
              onAction={onDelete}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function iconForKind(kind: SavedResult["kind"]): Icon {
  if (kind === "analysis") return Icon.Microphone;
  if (kind === "expression") return Icon.Message;
  return Icon.Text;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}
