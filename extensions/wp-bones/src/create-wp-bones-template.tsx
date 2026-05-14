import { Action, ActionPanel, Detail, Grid, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useEffect, useState } from "react";
import { Boilerplate } from "./hooks/types";
import { useBoilerplates } from "./hooks/use-boilerplates";
import { getIcon } from "./utils";

function BoilerplatePreview({ boilerplate }: { boilerplate: Boilerplate }) {
  // Discover default branch, then fetch README
  const { data: repoData, isLoading: isRepoLoading } = useFetch<{ default_branch?: string }>(
    `https://api.github.com/repos/wpbones/${boilerplate.name}`,
    { headers: { Accept: "application/vnd.github.v3+json" } },
  );

  const defaultBranch = repoData?.default_branch;
  const readmeUrl = defaultBranch
    ? `https://raw.githubusercontent.com/wpbones/${boilerplate.name}/${defaultBranch}/README.md`
    : "";

  const {
    data,
    error,
    isLoading: isReadmeLoading,
  } = useFetch<string>(readmeUrl, {
    execute: Boolean(defaultBranch),
    parseResponse: (response) => response.text(),
  });

  const isLoading = isRepoLoading || (Boolean(defaultBranch) && isReadmeLoading);
  const markdown =
    error || (!isLoading && !data)
      ? "#### README not found\n\nUnable to load the repository README."
      : data || "Loading README...";

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={boilerplate.title}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Create in GitHub"
            icon="github-white.png"
            url={`https://github.com/new?template_name=${boilerplate.name}&template_owner=wpbones`}
          />
          <Action.OpenInBrowser
            title="See in Action"
            icon="brand-wordpress.svg"
            url={`https://playground.wordpress.net/?blueprint-url=https://www.wpbones.com/wpkirk${boilerplate.slug === "base" ? "" : `-${boilerplate.slug}`}-boilerplate.json`}
          />
        </ActionPanel>
      }
    />
  );
}

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
                <Action.Push
                  title="Preview README"
                  icon={Icon.Eye}
                  shortcut={{ modifiers: ["cmd"], key: "p" }}
                  target={<BoilerplatePreview boilerplate={item} />}
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
