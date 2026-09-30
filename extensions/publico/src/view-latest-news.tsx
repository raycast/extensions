import { fetchLatestHeadlines } from "./api/client";
import { NewsListView } from "./components/NewsListView";

export default function Command() {
  return (
    <NewsListView
      fetchFn={fetchLatestHeadlines}
      searchBarPlaceholder="Search latest articles…"
      errorToastTitle="Unable to load latest articles"
      emptyTitle="No articles right now"
      emptyDescription="Check back soon. The latest articles from Público will appear here."
    />
  );
}
