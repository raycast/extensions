import { List } from "@raycast/api";

import { useBooks } from "./books/useBooks";
import { BooksListItems } from "./books/BooksListItems";
import { Category } from "./books/types";
import { getUrlParamsString } from "./utils";
import { ResultsList } from "./components/ResultsList";
import { ListActions } from "./components/Actions";

const CATEGORIES: { label: string; category: Category }[] = [
  { label: "Articles", category: "articles" },
  { label: "Book", category: "books" },
  { label: "Podcasts", category: "podcasts" },
  { label: "Supplementals", category: "supplementals" },
  { label: "Tweets", category: "tweets" },
];

export default function Command() {
  const { data, loading, refetch } = useBooks();
  const { next, previous } = data || {};

  return (
    <List
      isLoading={loading}
      enableFiltering
      searchBarAccessory={
        <List.Dropdown tooltip="Search Options" onChange={refetch}>
          <List.Dropdown.Item title={"All Categories"} value={""} />
          {CATEGORIES.map(({ label, category }) => (
            <List.Dropdown.Item key={category} title={label} value={`category=${category}&page=1`} />
          ))}
        </List.Dropdown>
      }
    >
      <ResultsList
        loading={loading}
        data={data}
        actions={
          <ListActions
            onHomeAction={() => refetch("")}
            onNextAction={next ? () => refetch(getUrlParamsString(next)) : undefined}
            onPreviousAction={previous ? () => previous && refetch(getUrlParamsString(previous)) : undefined}
          />
        }
        listView={BooksListItems}
      />
    </List>
  );
}
