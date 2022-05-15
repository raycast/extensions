import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, List } from "@raycast/api";
import { ParsedPaste, Publicity } from "pastebin-api";
import { usePaste, usePastes } from "./utils/hooks";
import { useState } from "react";
import dateFormat, { masks } from "dateformat";

function formatPaste(paste: ParsedPaste, content: string) {
  return `\`\`\`${paste.paste_format_short}\n${content}\n\`\`\``;
}

function formatDate(date: Date) {
  return dateFormat(date, masks.shortDate);
}

const publicityIcons: Record<Publicity, { value: Icon; tooltip: string }> = {
  [Publicity.Public]: {
    value: Icon.Globe,
    tooltip: "Public",
  },
  [Publicity.Private]: {
    value: Icon.Link,
    tooltip: "Private",
  },
  [Publicity.Unlisted]: {
    value: Icon.EyeSlash,
    tooltip: "Unlisted",
  },
};

export default function ListPastes() {
  const [selectedId, setSelectedId] = useState<string>();
  const { pastes, loading: listLoading, removePasting } = usePastes();
  const { paste: detail, loading: detailLoading } = usePaste(selectedId);

  return (
    <List isShowingDetail onSelectionChange={setSelectedId} isLoading={listLoading}>
      {pastes.map((paste) => (
        <List.Item
          key={paste.paste_key}
          id={paste.paste_key}
          title={paste.paste_title || "Untitled"}
          icon={publicityIcons[paste.paste_private]}
          detail={<List.Item.Detail isLoading={detailLoading} markdown={formatPaste(paste, detail)} />}
          accessories={[{ text: formatDate(new Date(paste.paste_date * 1000)), tooltip: "Creation Date" }]}
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
      ))}
    </List>
  );
}
