import { Action, ActionPanel, Detail, Icon, Keyboard, List, Toast, showToast } from "@raycast/api";
import { ReactNode } from "react";
import { clampDetail, textMeta } from "../utils/toolbox";

export interface ResultRow {
  /** Stable key */
  id: string;
  title: string;
  subtitle?: string;
  /** Multi-line detail, used by "View Details" and "Copy Details" */
  detail?: string;
  icon?: Icon;
  accessories?: List.Item.Accessory[];
  /** What the "Copy" action puts on the clipboard; defaults to detail ?? title */
  copyValue?: string;
  /** Extra actions, e.g. "Regenerate" */
  actions?: ReactNode;
}

interface ResultListProps {
  /** Section heading */
  sectionTitle?: string;
  isLoading?: boolean;
  rows: ResultRow[];
  searchBarPlaceholder?: string;
  /** Shown when the list is empty */
  emptyTitle?: string;
}

/**
 * Result list. Every command renders results through this, so the interactions stay
 * identical: ⏎ copies, ⌘⇧C copies the detail, ⌘⇧T copies the title, ⌘⇧⏎ copies the full
 * value, ⌘⇧P pastes into the active app.
 */
export function ResultList({
  sectionTitle,
  isLoading,
  rows,
  searchBarPlaceholder,
  emptyTitle = "No results",
}: ResultListProps) {
  return (
    <List isLoading={isLoading} searchBarPlaceholder={searchBarPlaceholder ?? "Filter results…"}>
      {rows.length === 0 ? (
        <List.EmptyView title={emptyTitle} description="Go back and enter a value" icon={Icon.MagnifyingGlass} />
      ) : null}
      <List.Section title={sectionTitle}>
        {rows.map((row) => {
          const full = row.copyValue ?? row.detail ?? row.title;
          const meta = textMeta(full);
          return (
            <List.Item
              key={row.id}
              icon={row.icon ?? Icon.Bookmark}
              title={row.title}
              subtitle={row.subtitle}
              accessories={row.accessories}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    title="Copy"
                    content={full}
                    onCopy={() => showToast({ style: Toast.Style.Success, title: "Copied" })}
                  />
                  <Action.CopyToClipboard
                    title="Copy Full Content"
                    content={full}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                  />
                  {row.detail ? (
                    <Action.Push
                      title="View Details"
                      icon={Icon.Eye}
                      target={<ResultDetail title={row.subtitle ?? "Details"} markdown={row.detail} />}
                    />
                  ) : null}
                  {row.detail ? (
                    <Action.CopyToClipboard
                      title="Copy Details"
                      content={row.detail}
                      shortcut={Keyboard.Shortcut.Common.Copy}
                    />
                  ) : null}
                  <Action.CopyToClipboard
                    title="Copy Title"
                    content={row.title}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy as JSON String"
                    content={JSON.stringify(full)}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "j" }}
                  />
                  <Action.Paste
                    title="Paste to Active App"
                    content={full}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                  />
                  <ActionPanel.Section title="Content Info">
                    <Action.CopyToClipboard
                      title={`${meta.chars} Chars · ${meta.lines} Lines · Longest ${meta.longestLine}`}
                      content={String(meta.chars)}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
                    />
                  </ActionPanel.Section>
                  {row.actions}
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

function ResultDetail({ title, markdown }: { title: string; markdown: string }) {
  const meta = textMeta(markdown);
  const { text, truncated } = clampDetail(markdown);
  return (
    <Detail
      navigationTitle={title}
      markdown={`\`\`\`\n${text}\n\`\`\`${truncated ? "\n\n> Content is too large. Only the beginning is rendered; copying still yields the full value." : ""}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Characters" text={String(meta.chars)} />
          <Detail.Metadata.Label title="Lines" text={String(meta.lines)} />
          <Detail.Metadata.Label title="Longest Line" text={`${meta.longestLine} chars`} />
          <Detail.Metadata.Label title="Bytes" text={`${meta.bytes} B`} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Content" content={markdown} />
          <Action.Paste
            title="Paste to Active App"
            content={markdown}
            shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
          />
          <Action.CopyToClipboard
            title="Copy as JSON String"
            content={JSON.stringify(markdown)}
            shortcut={{ modifiers: ["cmd", "shift"], key: "j" }}
          />
        </ActionPanel>
      }
    />
  );
}
