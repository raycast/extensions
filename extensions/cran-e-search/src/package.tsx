import { ActionPanel, Action, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import { URLSearchParams } from "node:url";
import { composeSearchParams, parseFetchResponse } from "./models/net";

const BASE_PACKAGE = "https://www.cran-e.com/package";
const BASE_API = "https://www.cran-e.com/api/package/overview";

type Hit = {
  name: string;
  title: string;
  version: string;
  slug: string;
  author_names: string[];
};

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const { data, isLoading } = useFetch(`${BASE_API}?` + new URLSearchParams(composeSearchParams(searchText)), {
    parseResponse: (res) => parseFetchResponse<Hit>(res),
  });

  return (
    <List
      throttle
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search CRAN/E packages..."
    >
      <List.Section
        title={!searchText.length ? "Packages by date of publication" : "Results"}
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
      subtitle={hit.title}
      accessories={[
        {
          tag: hit.version,
          tooltip: `Authored by ${hit.author_names.join(", ")}`,
        },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Actions">
            <Action.OpenInBrowser title="Open in Browser" url={`${BASE_PACKAGE}/${hit.slug}`} />
            <Action.CopyToClipboard
              title="Copy Install Command"
              content={`install.packages('${hit.name}')`}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
