import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, List } from "@raycast/api";
import { usePaste, usePastes } from "./utils/hooks";
import { useState } from "react";
import { formatDate, formatPaste, getProgrammingLanguageIcon, getPublicityIcon } from "./utils/style";

export default function ListPastes() {
  const [selectedId, setSelectedId] = useState<string>();
  const { pastes, loading: listLoading, removePasting } = usePastes();
  const { paste: detail, loading: detailLoading } = usePaste(selectedId);

  return (
    <List isShowingDetail onSelectionChange={setSelectedId} isLoading={listLoading}>
      {pastes.map((paste) => {
        const icon = getPublicityIcon(paste.paste_private);
        return (
          <List.Item
            key={paste.paste_key}
            id={paste.paste_key}
            title={paste.paste_title || "Untitled"}
            icon={icon}
            detail={
              <List.Item.Detail
                isLoading={detailLoading}
                markdown={formatPaste(paste, detail)}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Title" text={paste.paste_title || "Untitled"} />
                    <List.Item.Detail.Metadata.Label title="Visibility" text={icon.tooltip} icon={icon.value} />
                    <List.Item.Detail.Metadata.Label
                      title="Syntax"
                      text={paste.paste_format_long}
                      icon={{
                        source: getProgrammingLanguageIcon(paste.paste_format_short),
                      }}
                    />
                    <List.Item.Detail.Metadata.Label title="Hits" text={paste.paste_hits.toString()} />
                    <List.Item.Detail.Metadata.Label
                      title="Creation Date"
                      text={formatDate(new Date(paste.paste_date * 1000))}
                    />
                    {paste.paste_expire_date ? (
                      <List.Item.Detail.Metadata.Label
                        title="Expire Date"
                        text={formatDate(new Date(paste.paste_expire_date * 1000))}
                      />
                    ) : (
                      <List.Item.Detail.Metadata.Label title="Expire Date" text="Never" />
                    )}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={paste.paste_url} />
                <ActionPanel.Section>
                  <Action.CopyToClipboard
                    title="Copy Paste URL"
                    content={paste.paste_url}
                    shortcut={{ modifiers: ["cmd"], key: "." }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Paste Code"
                    content={detail}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Paste Title"
                    content={detail}
                    shortcut={{ modifiers: ["ctrl", "shift"], key: "," }}
                  />
                </ActionPanel.Section>
                <Action
                  title="Delete Paste"
                  icon={{ source: Icon.Trash, tintColor: Color.Red }}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={() => {
                    return confirmAlert({
                      title: "Delete Paste",
                      message: "This action cannot be undone",
                      icon: Icon.Trash,
                      primaryAction: {
                        title: "Delete",
                        style: Alert.ActionStyle.Destructive,
                        onAction: () => removePasting(paste.paste_key),
                      },
                    });
                  }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
