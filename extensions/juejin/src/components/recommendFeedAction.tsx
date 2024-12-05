import { Action, ActionPanel } from "@raycast/api";

export function RecommendFeedAction({ articleId }: { articleId: string }) {
  return (
    <ActionPanel>
      {articleId && <Action.OpenInBrowser url={`https://juejin.cn/post/${articleId}`} title="打开文章" />}
      {articleId && (
        <Action.CopyToClipboard
          title="复制链接"
          content={`https://juejin.cn/post/${articleId}`}
          shortcut={{ modifiers: ["cmd"], key: "." }}
        />
      )}
    </ActionPanel>
  );
}
