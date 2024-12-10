import { Action, ActionPanel } from "@raycast/api";

export function RecommendFeedAction({ articleId }: { articleId: string }) {
  return (
    <ActionPanel>
      {articleId && <Action.OpenInBrowser url={`https://juejin.cn/post/${articleId}`} title="Open In Browser" />}
      {articleId && (
        <Action.CopyToClipboard
          title="Copy Link"
          content={`https://juejin.cn/post/${articleId}`}
          shortcut={{ modifiers: ["cmd"], key: "." }}
        />
      )}
    </ActionPanel>
  );
}
