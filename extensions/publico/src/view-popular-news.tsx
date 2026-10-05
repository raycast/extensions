import { fetchTopNews } from "./api/client";
import { NewsListView } from "./components/NewsListView";

export default function Command() {
  return (
    <NewsListView
      fetchFn={fetchTopNews}
      searchBarPlaceholder="Search popular articles…"
      errorToastTitle="Unable to load popular articles"
      emptyTitle="No popular articles right now"
      emptyDescription="Check back soon. Popular articles from Público will appear here."
    />
  );
}
