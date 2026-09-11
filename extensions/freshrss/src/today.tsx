import ArticleList from "./article-list";

export default function Command() {
  return <ArticleList initialStatus="unread" initialPeriod="today" lockPeriod />;
}
