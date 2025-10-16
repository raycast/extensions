import { Detail, Icon, Action, ActionPanel } from "@raycast/api";
import getArticleDetail from "../utils/getArticleDetail";
import sportInfo from "../utils/getSportInfo";

export default function ArticleDetail({ articleId }: { articleId: string }) {
  const { articleDetailData, articleDetailLoading, articleDetailRevalidate } = getArticleDetail({ articleId });
  const currentLeague = sportInfo.getLeague();

  const articleDetail = articleDetailData?.headlines?.[0];
  const articleHeadline = articleDetail?.headline ?? "No Headline Found";
  const articleContent = articleDetail?.story ?? "Not Content Found";
  const articleAuthor = articleDetail?.byline ?? "Unknown";

  const articleImage = articleDetail?.images?.[0]?.url ?? ``;
  const articleLink = articleDetail?.links?.web?.href;

  function htmlToMarkdown(html: string): string {
    return html
      .replace(/<p>/g, "\n\n")
      .replace(/<\/p>/g, "")
      .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g, "[$2]($1)")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const articlePublished = articleDetail?.published ? formatDate(articleDetail?.published) : "Unknown";

  let articleType = articleDetail?.type ?? "Unknown";
  if (articleType === "HeadlineNews") {
    articleType = "Headline";
  }

  return (
    <Detail
      isLoading={articleDetailLoading}
      markdown={`# ${articleHeadline}

&nbsp;

Author: ${articleAuthor}
\nPublished: ${articlePublished}

---

&nbsp;

![Article Image](${articleImage})

${htmlToMarkdown(articleContent ?? "")}`}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Read Article on ESPN"
            url={`${articleLink ?? `https://www.espn.com/${currentLeague}`}`}
          />
          <Action.CopyToClipboard
            title="Copy Article Link"
            content={`${articleLink ?? `https://www.espn.com/${currentLeague}`}`}
          ></Action.CopyToClipboard>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={articleDetailRevalidate}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          ></Action>
        </ActionPanel>
      }
    />
  );
}
