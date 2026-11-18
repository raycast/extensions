import { ActionPanel, Action, Icon, Detail, Keyboard } from "@raycast/api";
import RedditResultItem from "./RedditApi/RedditResultItem";
import ToggleDetailAction from "./ToggleDetailAction";
import RefreshAction from "./RefreshAction";
import NewSearchAction from "./NewSearchAction";
import { postMarkdown } from "./util/postMarkdown";

export default function PostActionPanel({
  data,
  isShowingDetail,
  setIsShowingDetail,
  onRefresh,
  onNewSearch,
}: {
  data: RedditResultItem;
  isShowingDetail: boolean;
  setIsShowingDetail: (value: boolean) => void;
  onRefresh: () => void;
  onNewSearch?: () => void;
}) {
  const browser = <Action.OpenInBrowser url={data.url} icon={Icon.Globe} />;

  // "View Post" pushes a full-screen render of the same content the sidebar shows,
  // so it is only useful when the sidebar is hidden — offering both at once was the
  // "Show Details" / "Show Full Details" confusion. When the sidebar is visible,
  // the browser is the primary action instead.
  const viewPost = (
    <Action.Push
      title="View Post"
      icon={Icon.Text}
      target={
        <Detail
          navigationTitle={data.title}
          markdown={postMarkdown(data)}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={data.url} icon={Icon.Globe} />
            </ActionPanel>
          }
        />
      }
    />
  );

  return (
    <ActionPanel>
      {isShowingDetail ? (
        browser
      ) : (
        <>
          {viewPost}
          {browser}
        </>
      )}
      <Action.CopyToClipboard title="Copy Post URL" content={data.url} shortcut={Keyboard.Shortcut.Common.Copy} />
      <Action.CopyToClipboard
        title="Copy Post as Markdown"
        content={postMarkdown(data)}
        shortcut={Keyboard.Shortcut.Common.CopyName}
      />
      <ToggleDetailAction isShowingDetail={isShowingDetail} setIsShowingDetail={setIsShowingDetail} />
      <RefreshAction onRefresh={onRefresh} />
      {onNewSearch && <NewSearchAction onNewSearch={onNewSearch} />}
    </ActionPanel>
  );
}
