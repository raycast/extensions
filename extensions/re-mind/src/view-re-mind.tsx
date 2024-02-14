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

export default function ViewBookmarks() {
  const { isLoading, data: api } = useFetch("https://re-mind.danilocampos.cc/api/remindapi");

  const data = api as { bookmarks: Bookmark[] };
  const [list] = React.useState(data.bookmarks);

  const categoriesList = [...new Set(list.map((item: Bookmark) => item.category))];

  const [categories] = React.useState(categoriesList);
  const [selectedcategory, setSelectedCategory] = React.useState("All");

  const sortedList = list.sort((a: Bookmark, b: Bookmark) =>
    a.title.trim().toLowerCase().localeCompare(b.title.trim().toLowerCase()),
  );

  let filteredList: Bookmark[] = sortedList;
  if (selectedcategory !== "All") {
    filteredList = sortedList.filter((item: Bookmark) => item.category === selectedcategory);
  }

  return (
    <Grid
      isLoading={isLoading}
      columns={4}
      searchBarPlaceholder="Search for a website, studio, designer,..."
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Select category"
          storeValue={false}
          onChange={(newValue) => setSelectedCategory(newValue)}
        >
          <Grid.Dropdown.Section title="Categories">
            <Grid.Dropdown.Item key="All" title="All" value="All" />
            {categories.map((category) => (
              <Grid.Dropdown.Item key={category as string} title={category as string} value={category as string} />
            ))}
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
    >
      {filteredList.map((item: Bookmark) => (
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
