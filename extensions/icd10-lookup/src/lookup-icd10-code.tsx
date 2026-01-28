import { useState } from "react";
import { ActionPanel, List, Action } from "@raycast/api";
import { useFetch } from "@raycast/utils";

interface ICD10Response {
  [index: number]: [string, string][];
  3: [string, string][];
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const { isLoading, data } = useFetch(
    `https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search?sf=code,name&terms=${searchText}&maxList=1000`,
    {
      execute: searchText.length > 0,
      keepPreviousData: false,
      async parseResponse(response) {
        if (!response.ok) {
          throw new Error(response.statusText);
        }

        const data = (await response.json()) as ICD10Response;
        const codes = data[3].map((item) => ({
          code: item[0],
          desc: item[1],
        }));

        return codes;
      },
    },
  );

  return (
    <List
      searchBarPlaceholder="Type to search for ICD-10 codes..."
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      throttle
    >
      <List.EmptyView title="Type to Search (e.g. E11.9)" />
      {data?.map((result) => (
        <List.Item
          key={result.code}
          title={result.code}
          subtitle={result.desc}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Code to Clipboard" content={result.code} />
              <Action.CopyToClipboard title="Copy Description to Clipboard" content={result.desc} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
