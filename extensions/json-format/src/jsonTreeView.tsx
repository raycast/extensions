import { Detail, ActionPanel, Action, getPreferenceValues } from "@raycast/api";
import { useMemo, useState } from "react";

interface JsonTreeViewProps {
  json: string | string[];
  isLoading?: boolean;
}

export function JsonTreeView({ json, isLoading = false }: JsonTreeViewProps) {
  const { autopaste, maxInitialLines } = getPreferenceValues<Preferences>();
  const maxLines = parseInt(maxInitialLines, 10) || 10000;
  const [showAll, setShowAll] = useState(false);

  const { displayContent, fullContent, isTruncated, totalLines, displayLines } = useMemo(() => {
    const content = typeof json === "string" ? json : json.join("\n");
    if (!content) {
      return { displayContent: "", fullContent: "", isTruncated: false, totalLines: 0, displayLines: 0 };
    }

    const lines = content.split("\n");
    const total = lines.length;

    if (showAll || total <= maxLines) {
      return {
        displayContent: content,
        fullContent: content,
        isTruncated: false,
        totalLines: total,
        displayLines: total,
      };
    }

    const truncated = lines.slice(0, maxLines).join("\n");
    return {
      displayContent: truncated,
      fullContent: content,
      isTruncated: true,
      totalLines: total,
      displayLines: maxLines,
    };
  }, [json, showAll, maxLines]);

  // 加载中或内容为空时显示 loading 状态
  if (isLoading || !fullContent) {
    return <Detail isLoading={true} markdown="" />;
  }

  const truncationNotice = isTruncated
    ? `\n\n---\n⚠️ **Showing ${displayLines} of ${totalLines} lines.** Press \`⌘ + L\` to load all.`
    : "";

  const markdown = `\`\`\`json\n${displayContent}\n\`\`\`${truncationNotice}`;

  return (
    <Detail
      markdown={markdown}
      navigationTitle="Formatted JSON"
      actions={
        <ActionPanel>
          {autopaste ? (
            <Action.Paste title="Paste Full JSON" content={fullContent} />
          ) : (
            <Action.CopyToClipboard title="Copy Full JSON" content={fullContent} />
          )}
          {isTruncated && (
            <Action
              title="Load All Lines"
              shortcut={{ modifiers: ["cmd"], key: "l" }}
              onAction={() => setShowAll(true)}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
