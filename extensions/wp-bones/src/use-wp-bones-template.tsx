import { Action, ActionPanel, Grid } from "@raycast/api";
import { useEffect, useState } from "react";
import items from "./templates";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [filteredList, filterList] = useState(items);

  useEffect(() => {
    filterList(items.filter((item) => item.keywords.some((keyword) => keyword.includes(searchText))));
  }, [searchText]);

  return (
    <Grid
      aspectRatio="16/9"
      columns={3}
      fit={Grid.Fit.Fill}
      inset={Grid.Inset.Small}
      filtering={false}
      onSearchTextChange={setSearchText}
      navigationTitle="Search WP Bones Templates"
      searchBarPlaceholder="Search templates by keyword"
    >
      {filteredList.map((item) => (
        <Grid.Item
          key={item.name}
          content={item.icon}
          title={item.title}
          subtitle={item.subtitle}
          actions={
            <ActionPanel title="Create">
              <Action.OpenInBrowser
                title="Create in GitHub"
                icon="github-white.png"
                url={`https://github.com/new?template_name=${item.name}&template_owner=wpbones`}
              />
              <Action.OpenInBrowser
                title="View Source Code"
                icon="github-white.png"
                url={`https://github.com/wpbones/${item.name}`}
              />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
