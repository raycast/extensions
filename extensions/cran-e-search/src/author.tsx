import { ActionPanel, Action, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import { URLSearchParams } from "node:url";
import { composeSearchParams, parseFetchResponse } from "./models/net";

const BASE_PACKAGE = "https://www.cran-e.com/author";
const BASE_API = "https://www.cran-e.com/api/author/overview";

type Hit = {
  name: string;
  slug: string;
  totalPackages: number;
};

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const { data, isLoading } = useFetch(`${BASE_API}?` + new URLSearchParams(composeSearchParams(searchText)), {
    parseResponse: (res) =>
      parseFetchResponse<Hit>(res).then((hits) =>
        hits.map((hit) => ({
          ...hit,
          name: hit.name.replaceAll(`"`, " "),
        }))
      ),
  });

  return (
    <List
      throttle
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search CRAN/E authors..."
    >
      <List.Section
        title={!searchText.length ? "Authors by latest publication" : "Results"}
        subtitle={data?.length + ""}
      >
        {data?.map((hit) => (
          <SearchListItem key={hit.name} hit={hit} />
        ))}
      </List.Section>
    </List>
  );
}

function SearchListItem({ hit }: { hit: Hit }) {
  return (
    <List.Item
      title={hit.name}
      accessories={[{ tag: `${hit.totalPackages} ${hit.totalPackages === 1 ? "package" : "packages"}` }]}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Actions">
            <Action.OpenInBrowser title="Open in Browser" url={`${BASE_PACKAGE}/${hit.slug}`} />
            <Action.CopyToClipboard
              title="Copy Profile URL"
              content={`${BASE_PACKAGE}/${hit.slug}`}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
