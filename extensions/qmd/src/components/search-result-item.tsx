import { existsSync } from "node:fs";
import { Action, ActionPanel, Clipboard, Color, Icon, List, showToast, Toast } from "@raycast/api";
import type { QmdGetResult, QmdSearchResult } from "../types";
import { formatScorePercentage, getScoreColor, runQmd } from "../utils/qmd";

const CONTEXT_LINE_PATTERN = /^@@\s+[^\n]+/;

interface SearchResultItemProps {
  result: QmdSearchResult;
  showDetail?: boolean;
  onToggleDetail?: () => void;
  // Option toggles
  showFullDocument: boolean;
  showLineNumbers: boolean;
  showAllResults: boolean;
  onToggleFullDocument: () => void;
  onToggleLineNumbers: () => void;
  onToggleAllResults: () => void;
}

function getTagColor(scoreColor: string): Color {
  if (scoreColor === "green") {
    return Color.Green;
  }
  if (scoreColor === "yellow") {
    return Color.Yellow;
  }
  return Color.Red;
}

function parseSnippet(snippet: string) {
  const contextMatch = snippet.match(CONTEXT_LINE_PATTERN);
  const contextLine = contextMatch ? contextMatch[0] : null;
  const contentMarkdown = contextMatch ? snippet.slice(contextMatch[0].length).trim() : snippet;
  return { contextLine, contentMarkdown };
}

async function copyDocumentContent(docid: string) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Fetching content...",
  });

  const getResult = await runQmd<QmdGetResult>(["get", `#${docid}`, "--full"]);

  if (getResult.success && getResult.data) {
    await Clipboard.copy(getResult.data.content);
    toast.style = Toast.Style.Success;
    toast.title = "Content copied";
  } else {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to fetch content";
    toast.message = getResult.error;
  }
}

export function SearchResultItem({
  result,
  showDetail,
  onToggleDetail,
  showFullDocument,
  showLineNumbers,
  showAllResults,
  onToggleFullDocument,
  onToggleLineNumbers,
  onToggleAllResults,
}: SearchResultItemProps) {
  // Display path - use relative path or extract from file URL
  const displayPath = result.path || result.file || "Unknown";
  const fullPath = result.fullPath;
  const fileExists = fullPath ? existsSync(fullPath) : false;

  const scoreColor = getScoreColor(result.score);
  const scorePercentage = formatScorePercentage(result.score);

  // Map score color to Raycast Color
  const tagColor = getTagColor(scoreColor);

  const accessories: List.Item.Accessory[] = [{ tag: { value: scorePercentage, color: tagColor } }];

  // Parse snippet to extract context line (e.g., "@@ -1,3 (0 before, 2 after)")
  const snippet = result.snippet || "";
  const { contextLine, contentMarkdown } = parseSnippet(snippet);

  return (
    <List.Item
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {fullPath && fileExists && <Action.Open icon={Icon.Document} target={fullPath} title="Open in Editor" />}
            {fullPath && fileExists && <Action.ShowInFinder path={fullPath} />}
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            {fullPath && (
              <Action.CopyToClipboard
                content={fullPath}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
                title="Copy Path"
              />
            )}
            <Action
              icon={Icon.Clipboard}
              onAction={() => copyDocumentContent(result.docid)}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              title="Copy Content"
            />
            <Action.CopyToClipboard
              content={result.docid}
              shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
              title="Copy Document Id"
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Options">
            <Action
              icon={showFullDocument ? Icon.CheckCircle : Icon.Circle}
              onAction={onToggleFullDocument}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
              title={showFullDocument ? "Hide Full Document" : "Show Full Document"}
            />
            <Action
              icon={showLineNumbers ? Icon.CheckCircle : Icon.Circle}
              onAction={onToggleLineNumbers}
              shortcut={{ modifiers: ["cmd"], key: "l" }}
              title={showLineNumbers ? "Hide Line Numbers" : "Show Line Numbers"}
            />
            <Action
              icon={showAllResults ? Icon.CheckCircle : Icon.Circle}
              onAction={onToggleAllResults}
              shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
              title={showAllResults ? "Limit Results" : "Show All Results"}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="View">
            {onToggleDetail && (
              <Action
                icon={showDetail ? Icon.EyeDisabled : Icon.Eye}
                onAction={onToggleDetail}
                shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                title={showDetail ? "Hide Detail" : "Show Detail"}
              />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
      detail={
        <List.Item.Detail
          markdown={contentMarkdown}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label
                icon={Icon.Folder}
                text={result.collection || "Unknown"}
                title="Collection"
              />
              <List.Item.Detail.Metadata.Label icon={Icon.Document} text={displayPath} title="Path" />
              <List.Item.Detail.Metadata.Separator />
              {contextLine && <List.Item.Detail.Metadata.Label icon={Icon.Text} text={contextLine} title="Context" />}
              <List.Item.Detail.Metadata.Label text={result.docid} title="DocID" />
              <List.Item.Detail.Metadata.TagList title="Score">
                <List.Item.Detail.Metadata.TagList.Item color={tagColor} text={scorePercentage} />
              </List.Item.Detail.Metadata.TagList>
            </List.Item.Detail.Metadata>
          }
        />
      }
      icon={fileExists ? Icon.Document : { source: Icon.Document, tintColor: Color.SecondaryText }}
      title={result.title || displayPath}
    />
  );
}
