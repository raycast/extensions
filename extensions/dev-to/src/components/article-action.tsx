import { Action, ActionPanel, Clipboard, Icon, showHUD, showToast, Toast } from "@raycast/api";
import CreateArticle from "../create-article";
import { Article } from "../types/articles";
import { preference } from "../utils/functions";

export function ArticleAction({ article, onRevalidate }: { article: Article; onRevalidate: () => void }) {
  const { body_markdown, url, published } = article;
  return (
    <>
      <ActionPanel.Section title={"Article Actions"}>
        <Action.OpenInBrowser
          title={"Open in Browser"}
          icon={Icon.Globe}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
          url={published ? url : `${url}/edit`}
        />
        <Action.CopyToClipboard
          title={"Copy Link"}
          icon={Icon.Link}
          shortcut={{ modifiers: ["cmd"], key: "l" }}
          content={published ? url : `${url}/edit`}
        />
        <Action.Push
          title={"Create Article"}
          icon={Icon.Plus}
          shortcut={{ modifiers: ["cmd"], key: "n" }}
          target={<CreateArticle article={undefined} />}
        />
        <Action.Push
          title={"Edit Article"}
          icon={Icon.Pencil}
          shortcut={{ modifiers: ["cmd"], key: "e" }}
          target={<CreateArticle article={article} onEdit={onRevalidate} />}
        />
      </ActionPanel.Section>

      <ActionPanel.Section title={"Copy Paste"}>
        <Action
          title={preference.primaryAction === "copy" ? "Copy to Clipboard" : "Paste to Active App"}
          icon={preference.primaryAction === "copy" ? Icon.Clipboard : Icon.Window}
          onAction={async () => {
            if (preference.primaryAction === "copy") {
              await Clipboard.copy(body_markdown);
              await showToast(Toast.Style.Success, "Copy article to clipboard!");
            } else {
              await Clipboard.paste(body_markdown);
              await showHUD("Paste to Active App");
            }
          }}
        />
        <Action
          title={preference.primaryAction === "copy" ? "Paste to Active App" : "Copy to Clipboard"}
          icon={preference.primaryAction === "copy" ? Icon.Window : Icon.Clipboard}
          onAction={async () => {
            if (preference.primaryAction === "copy") {
              await Clipboard.paste(body_markdown);
              await showHUD("Paste to Active App");
            } else {
              await Clipboard.copy(body_markdown);
              await showToast(Toast.Style.Success, "Copy article to clipboard!");
            }
          }}
        />
      </ActionPanel.Section>
    </>
  );
}
