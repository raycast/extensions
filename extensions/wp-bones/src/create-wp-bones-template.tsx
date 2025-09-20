import { Action, ActionPanel, Grid } from "@raycast/api";
import { useEffect, useState } from "react";
import { Boilerplate } from "./hooks/types";
import { useBoilerplates } from "./hooks/use-boilerplates";
import { getIcon } from "./utils";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [filteredList, filterList] = useState<Boilerplate[]>([]);
  const { boilerplates } = useBoilerplates();

  useEffect(() => {
    if (!boilerplates) {
      return;
    }
    filterList(boilerplates.filter((item) => item.keywords.some((keyword) => keyword.includes(searchText))));
  }, [searchText, boilerplates]);

  return (
    <Grid
      aspectRatio="16/9"
      columns={3}
      fit={Grid.Fit.Contain}
      inset={Grid.Inset.Small}
      filtering={false}
      onSearchTextChange={setSearchText}
      navigationTitle="Search WP Bones Templates"
      searchBarPlaceholder="Search templates by keyword"
    >
      {filteredList.length === 0 ? (
        <Grid.EmptyView title="No templates found" description="Type a keyword to search for a template." />
      ) : (
        filteredList.map((item) => (
          <Grid.Item
            key={item.name}
            content={getIcon(item.icon)}
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
                  title="See in Action"
                  icon="brand-wordpress.svg"
                  url={`https://playground.wordpress.net/?blueprint-url=https://www.wpbones.com/wpkirk${item.slug === "base" ? "" : `-${item.slug}`}-boilerplate.json`}
                />
                <Action.OpenInBrowser
                  title="View Source Code"
                  icon="github-white.png"
                  url={`https://github.com/wpbones/${item.name}`}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </Grid>
  );
}
