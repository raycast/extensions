import React from "react";
import { ActionPanel, Action, Grid } from "@raycast/api";
import { useFetch } from "@raycast/utils";

type Bookmark = {
  id: string;
  imageurl: string;
  title: string;
  category: string;
  url: string;
};

type Response = {
  bookmarks: Bookmark[];
};

export default function ViewLinks() {
  const { isLoading, data } = useFetch<Response>("https://re-mind.danilocampos.cc/api/remindapi");
  const [selectedcategory, setSelectedCategory] = React.useState("All");

  const bookmarks = data?.bookmarks || [];

  const categoriesList = [...new Set(bookmarks.map((bookmark) => bookmark.category))];

  const sortedBookmarks = bookmarks.sort((a, b) =>
    a.title.trim().toLowerCase().localeCompare(b.title.trim().toLowerCase()),
  );

  let filteredBookmarks = sortedBookmarks;

  if (selectedcategory !== "All") {
    filteredBookmarks = sortedBookmarks.filter((bookmark) => bookmark.category === selectedcategory);
  }

  return (
    <Grid
      isLoading={isLoading}
      columns={4}
      searchBarPlaceholder="Search for a website, studio, designer"
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Select category"
          storeValue={false}
          onChange={(newValue) => setSelectedCategory(newValue)}
        >
          <Grid.Dropdown.Section title="Categories">
            <Grid.Dropdown.Item key="All" title="All" value="All" />
            {categoriesList.map((category) => (
              <Grid.Dropdown.Item key={category as string} title={category as string} value={category as string} />
            ))}
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
    >
      {filteredBookmarks.map((item: Bookmark) => (
        <Grid.Item
          key={item.id}
          content={item.imageurl}
          title={item.title}
          subtitle={selectedcategory === "All" ? item.category : undefined}
          keywords={[item.url]}
          actions={
            <ActionPanel title={item.title}>
              <Action.OpenInBrowser url={item.url} />
              <Action.CopyToClipboard title={item.url} content={item.url} />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
