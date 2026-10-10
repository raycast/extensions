import { Action, ActionPanel, Clipboard, Icon, List, open, showHUD, showToast, Toast } from "@raycast/api";
import { MESSAGES } from "../constants";
import type { ListItem } from "../types";
import { fetchSnippet, getFragmentValue, showApiError } from "../utils/api";

interface Props {
  item: ListItem;
  value: string | null | undefined;
  error?: string;
}

function getMarkdown(item: ListItem, value: string | null | undefined, error?: string) {
  const header = `**Fragment:** ${item.name}\n\n**Language:** ${item.language}\n`;

  if (error) return `${header}\n${error}`;
  if (value === undefined) return header;
  if (value === null) return `${header}\n${MESSAGES.CONTENT_UNAVAILABLE}`;

  return `${header}\`\`\`${item.language}\n${value}\n\`\`\``;
}

export function SnippetListItem({ item, value, error }: Props) {
  async function copy() {
    try {
      const content = value !== undefined ? value : getFragmentValue(item, await fetchSnippet(item.snippetId));

      if (content === null || content === undefined) {
        await showToast(Toast.Style.Failure, MESSAGES.CONTENT_UNAVAILABLE);
        return;
      }

      await Clipboard.copy(content);
      await showHUD("Copied to Clipboard");
    } catch (error) {
      await showApiError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  return (
    <List.Item
      id={item.id}
      title={item.snippetName}
      icon={Icon.Document}
      accessories={[{ text: item.description }]}
      detail={<List.Item.Detail isLoading={value === undefined && !error} markdown={getMarkdown(item, value, error)} />}
      actions={
        <ActionPanel>
          {typeof value === "string" ? (
            <Action.CopyToClipboard content={value} />
          ) : (
            <Action title="Copy to Clipboard" icon={Icon.Clipboard} onAction={copy} />
          )}
          <Action
            title="Open in massCode"
            icon={Icon.AppWindow}
            onAction={() => open(`masscode://goto?snippetId=${item.snippetId}`)}
          />
        </ActionPanel>
      }
    />
  );
}
