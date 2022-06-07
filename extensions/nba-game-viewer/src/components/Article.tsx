import { List, ActionPanel, Action, Icon } from "@raycast/api";
import type { Article } from "../types/news.types";

type PropTypes = {
  article: Article;
  isShowingDetail: boolean;
  setIsShowingDetail: any;
};

const ArticleComponent = ({ article, isShowingDetail, setIsShowingDetail }: PropTypes) => {
  return (
    <List.Item
      key={article.title}
      title={article.title}
      icon={{ source: article.imageURL }}
      accessories={[{ text: `${new Date(article.publishedAt).toLocaleDateString()}` }]}
      detail={
        <List.Item.Detail
          markdown={`<img src="${article.imageURL}" alt="image" width="350" />`}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Title" text={article.title} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="Date Published"
                text={`${new Date(article.publishedAt).toLocaleDateString()}`}
              />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Details" text={article.description} />
              <List.Item.Detail.Metadata.Separator />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel title="NBA News Actions">
          <Action
            title={isShowingDetail ? "Hide Article Info" : "Show Article Info"}
            icon={Icon.Sidebar}
            shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
            onAction={() => setIsShowingDetail(!isShowingDetail)}
          />
          <Action.OpenInBrowser url={article.url} title="View on ESPN" />
        </ActionPanel>
      }
    />
  );
};

export default ArticleComponent;
