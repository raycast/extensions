import { Action, ActionPanel, getPreferenceValues, Icon, LaunchProps, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";

interface LibraryItem {
  name: string;
  latest: string;
  github: {
    user: string;
    repo: string;
    stargazers_count: number;
    forks: number;
    subscribers_count: number;
  } | null;
  description: string | null;
  keywords: string[] | null;
}
interface LibraryResult {
  results: LibraryItem[];
  total: number;
  available: number;
}
interface ErrorResult {
  error: true;
  status: number;
  message: string;
}

export default function SearchLibraries(props: LaunchProps<{ arguments: Arguments.SearchLibraries }>) {
  const { limit } = getPreferenceValues<Preferences.SearchLibraries>();
  const [searchText, setSearchText] = useState(props.arguments.library || "");
  const { isLoading, data: libraries } = useFetch(
    `https://api.cdnjs.com/libraries?` +
      new URLSearchParams({
        search: searchText,
        limit: limit.toString(),
        fields: "name,github,description,keywords",
      }),
    {
      async parseResponse(response) {
        const result = (await response.json()) as LibraryResult | ErrorResult;
        if ("error" in result) throw new Error(result.message);
        return result.results;
      },
      initialData: [],
    },
  );

  return (
    <List isLoading={isLoading} isShowingDetail searchText={searchText} onSearchTextChange={setSearchText} throttle>
      {libraries.map((library) => (
        <List.Item
          key={library.name}
          icon="cdnjs.png"
          title={library.name}
          detail={
            <List.Item.Detail
              markdown={library.description}
              metadata={
                <List.Item.Detail.Metadata>
                  {library.github ? (
                    <List.Item.Detail.Metadata.Link
                      title="GitHub"
                      text={`${library.github.user}/${library.github.repo}`}
                      target={`https://github.com/${library.github.user}/${library.github.repo}`}
                    />
                  ) : (
                    <List.Item.Detail.Metadata.Label title="GitHub Repo" icon={Icon.Minus} />
                  )}
                  {library.keywords?.length ? (
                    <List.Item.Detail.Metadata.TagList title="Keywords">
                      {library.keywords.map((keyword) => (
                        <List.Item.Detail.Metadata.TagList.Item key={keyword} text={keyword} />
                      ))}
                    </List.Item.Detail.Metadata.TagList>
                  ) : (
                    <List.Item.Detail.Metadata.Label title="Keywords" icon={Icon.Minus} />
                  )}
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Latest URL" content={library.latest} />
              <Action.OpenInBrowser title="Open Latest URL" url={library.latest} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
