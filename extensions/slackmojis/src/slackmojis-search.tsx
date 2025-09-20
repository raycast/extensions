import { useState } from "react";
import { ActionPanel, Action, Grid, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { Slackmoji } from "./types";
import { copyFileToClipboard } from "./actions/copyFileToClipboard";
import { downloadFile } from "./actions/downloadFile";

const REGULAR_PAGE_SIZE = 500;
const SEARCH_PAGE_SIZE = 24;

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const { data, pagination, isLoading } = useFetch(
    (options) => {
      if (searchText) {
        return (
          "https://slackmojis.com/emojis/search.json?" +
          new URLSearchParams({ page: String(options.page), query: searchText }).toString()
        );
      }
      return "https://slackmojis.com/emojis.json?" + new URLSearchParams({ page: String(options.page) }).toString();
    },
    {
      mapResult(result: Slackmoji[]) {
        return {
          data: result ? result.filter(Boolean) : [],
          hasMore: searchText ? result?.length === SEARCH_PAGE_SIZE : result?.length === REGULAR_PAGE_SIZE,
          pageSize: searchText ? SEARCH_PAGE_SIZE : REGULAR_PAGE_SIZE,
        };
      },
      keepPreviousData: true,
    },
  );

  return (
    <Grid
      isLoading={isLoading}
      columns={8}
      inset={Grid.Inset.Medium}
      pagination={pagination}
      filtering={false}
      throttle={true}
      onSearchTextChange={setSearchText}
    >
      {data?.map(({ id, name, image_url, credit }) => (
        <Grid.Item
          key={id}
          content={{ value: { source: image_url }, tooltip: `${name} - Added by ${credit}` }}
          title={name}
          actions={
            <ActionPanel>
              <Action
                icon={Icon.Clipboard}
                title="Copy to Clipboard"
                onAction={() => copyFileToClipboard(image_url, name)}
              />
              <Action icon={Icon.Download} title="Download" onAction={() => downloadFile(image_url, name)} />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
