import { List, Icon, Color } from "@raycast/api";
import { Article, formatDate, truncateText } from "../utils";

interface ArticleListItemProps {
  article: Article;
  actions: React.ReactNode;
}

export default function ArticleListItem({ article, actions }: ArticleListItemProps) {
  const accessories: List.Item.Accessory[] = [];

  // Date as accessory
  if (article.pubDate) {
    accessories.push({
      date: new Date(article.pubDate),
      tooltip: formatDate(article.pubDate),
    });
  }

  // Author as accessory, if available
  if (article.creator) {
    accessories.push({
      icon: { source: Icon.Person, tintColor: Color.PrimaryText },
      tooltip: `Author: ${article.creator}`,
    });
  }

  // Categories as tags, if available
  if (article.categories && article.categories.length > 0) {
    accessories.push({
      tag: {
        value: article.categories[0],
        color: Color.Blue,
      },
      tooltip: `Categories: ${article.categories.join(", ")}`,
    });
  }

  return (
    <List.Item
      title={article.title}
      subtitle={truncateText(article.description, 100)}
      accessories={accessories}
      actions={actions}
      icon={{ source: Icon.Document, tintColor: Color.Blue }}
    />
  );
}
