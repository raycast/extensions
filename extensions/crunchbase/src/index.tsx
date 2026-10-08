import { ActionPanel, Action, List, showToast, Toast, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { MeiliSearch } from "meilisearch";

const client = new MeiliSearch({
  host: "https://ms-dbba6af2f023-106.sfo.meilisearch.io",
  apiKey: "dae973f3b574cc85462af90b6bb71eb72b30faaa8a47d8c4df91376c1c3c9d8a",
});

const index = client.index("crunchbase");

function truncate(text: string, length: number) {
  if (text.length <= length) {
    return text;
  }

  return text.substr(0, length) + "\u2026";
}

export default function Command() {
  const [searchResults, setSearchResults] = useState<Array<SearchResult> | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [showingDetail, setShowingDetail] = useState(true);

  const search = async (query = "") => {
    setIsLoading(true);

    return await index
      .search(truncate(query, 20))
      .then((res) => {
        setIsLoading(false);
        return res.hits as Array<SearchResult>;
      })
      .catch((err) => {
        setIsLoading(false);
        showToast(Toast.Style.Failure, "Crunchbase Error", err.message);
        return [];
      });
  };

  useEffect(() => {
    (async () => setSearchResults(await search()))();
  }, []);

  return (
    <List
      isLoading={isLoading || searchResults === undefined}
      isShowingDetail={showingDetail}
      onSearchTextChange={async (query) => setSearchResults(await search(query))}
      searchBarPlaceholder="Search Crunchbase..."
      throttle
    >
      <List.Section
        title="Results"
        subtitle={
          searchResults?.length && searchResults?.length == 20
            ? searchResults?.length + "+"
            : searchResults?.length + ""
        }
      >
        {searchResults
          ?.filter((searchResult) => {
            return searchResult.uuid && searchResult.name;
          })
          .map((searchResult) => (
            <List.Item
              key={searchResult.uuid}
              title={searchResult.name}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    {searchResult.cb_url ? (
                      <Action.OpenInBrowser title="Open Crunchbase" url={searchResult.cb_url} />
                    ) : null}
                    {searchResult.homepage_url ? (
                      <Action.OpenInBrowser title="Open Website" url={searchResult.homepage_url} />
                    ) : null}
                    {searchResult.facebook_url ? (
                      <Action.OpenInBrowser title="Open Facebook" url={searchResult.facebook_url} />
                    ) : null}
                    {searchResult.twitter_url ? (
                      <Action.OpenInBrowser title="Open Twitter" url={searchResult.twitter_url} />
                    ) : null}
                    {searchResult.linkedin_url ? (
                      <Action.OpenInBrowser title="Open Linkedin" url={searchResult.linkedin_url} />
                    ) : null}
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      title="Toggle Details"
                      icon={Icon.Sidebar}
                      onAction={() => setShowingDetail(!showingDetail)}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
              detail={
                <List.Item.Detail
                  markdown={
                    searchResult.logo_url ? `<img src="${searchResult.logo_url}" alt="logo" height="200"/>` : ""
                  }
                  metadata={
                    <List.Item.Detail.Metadata>
                      {searchResult.short_description ? (
                        <>
                          <List.Item.Detail.Metadata.Label title="Description" />
                          <List.Item.Detail.Metadata.Label title={searchResult.short_description} />
                          <List.Item.Detail.Metadata.Separator />
                        </>
                      ) : null}
                      <List.Item.Detail.Metadata.Label title="Info" />
                      <List.Item.Detail.Metadata.Label title="Type" text={searchResult.type || "-"} />
                      <List.Item.Detail.Metadata.Label title="Role" text={searchResult.primary_role || "-"} />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label title="Location" />
                      <List.Item.Detail.Metadata.Label title="City" text={searchResult.city || "-"} />
                      <List.Item.Detail.Metadata.Label title="Region" text={searchResult.region || "-"} />
                      <List.Item.Detail.Metadata.Label title="Country Code" text={searchResult.country_code || "-"} />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label title="Social" />
                      {searchResult.cb_url ? (
                        <List.Item.Detail.Metadata.Link title="Crunchbase" target={searchResult.cb_url} text="Link" />
                      ) : null}
                      {searchResult.facebook_url ? (
                        <List.Item.Detail.Metadata.Link
                          title="Facebook"
                          target={searchResult.facebook_url}
                          text="Link"
                        />
                      ) : null}
                      {searchResult.twitter_url ? (
                        <List.Item.Detail.Metadata.Link title="Twitter" target={searchResult.twitter_url} text="Link" />
                      ) : null}
                      {searchResult.linkedin_url ? (
                        <List.Item.Detail.Metadata.Link
                          title="Linkedin"
                          target={searchResult.linkedin_url}
                          text="Link"
                        />
                      ) : null}
                      {searchResult.homepage_url ? (
                        <List.Item.Detail.Metadata.Link
                          title="Website"
                          target={searchResult.homepage_url}
                          text={searchResult.domain}
                        />
                      ) : null}
                    </List.Item.Detail.Metadata>
                  }
                />
              }
            />
          ))}
      </List.Section>
    </List>
  );
}

/** Parse the response from the fetch query into something we can display */
interface SearchResult {
  uuid: string;
  name: string;
  type: string;
  primary_role: string;
  cb_url: string;
  domain: string;
  homepage_url: string;
  logo_url?: string;
  facebook_url?: string;
  twitter_url?: string;
  linkedin_url?: string;
  city: string;
  region: string;
  country_code: string;
  short_description: string;
}
