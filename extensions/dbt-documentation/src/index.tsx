import { ActionPanel, List, Action, Detail, Icon, Keyboard } from "@raycast/api";
import { useMemo, useState } from "react";
import algoliasearch from "algoliasearch/lite";
import { load } from "cheerio";
import { useCachedPromise, useFetch } from "@raycast/utils";

type DocSearchHit = {
  objectID: string;
  hierarchy: {
    lvl0: string | null;
    lvl1: string | null;
    lvl2: string | null;
    lvl3: string | null;
    lvl4: string | null;
    lvl5: string | null;
    lvl6: string | null;
  };
  content: string | null;
  url: string;
  anchor: string | null;
  type: string;
};

const APPID = "57ZWAOQC7F";
const APIKEY = "04a5092253f5120fdff2c77b3847d0e1";
const INDEX = "dbt";

export function ListCodeSnippets(props: { url: string }) {
  const url = props.url;

  const { isLoading, data: listSnippets } = useFetch(url, {
    async parseResponse(response) {
      if (!response.ok) throw new Error(response.statusText);
      const result = await response.text();
      return result;
    },
    mapResult(result) {
      const $ = load(result);
      const codes = $(`div > pre > code`);
      const listSnippetsQuery: Array<string> = [];

      codes.each(function (index, element) {
        // for each snippet the code is split across different spans
        // we store each line as a string in the array codeIndividualSnippet and then join the lines
        const codeIndividualSnippet: Array<string> = [];
        $(element)
          .children()
          .each(function (index, element_child) {
            codeIndividualSnippet.push($(element_child).text());
          });
        listSnippetsQuery.push(codeIndividualSnippet.join("\n"));
      });
      return {
        data: listSnippetsQuery,
      };
    },
    initialData: [],
    failureToastOptions: {
      message: "Issue parsing the documentation page",
    },
  });

  if (listSnippets.length > 0) {
    return (
      <List isShowingDetail isLoading={isLoading} navigationTitle="Code Snippets">
        {listSnippets?.map((item, index) => (
          <List.Item
            key={index}
            title={item.replaceAll("\n", " ").replaceAll("    ", "  ")}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={item} title="Copy Code to Clipboard" />
                <Action.Push
                  title="Show Code in Full Page"
                  icon={Icon.AppWindowList}
                  target={<SnippetDetails code_snippet={item} />}
                />
                <Action.OpenInBrowser url={url} title="Open Page in Browser" shortcut={Keyboard.Shortcut.Common.Open} />
                <Action.CopyToClipboard content={url} title="Copy Page URL" shortcut={Keyboard.Shortcut.Common.Copy} />
              </ActionPanel>
            }
            detail={<List.Item.Detail markdown={["```", item, "```"].join("\n")} />}
          />
        ))}
      </List>
    );
  } else {
    return <List isLoading={isLoading} navigationTitle="Code Snippets"></List>;
  }
}

export function SnippetDetails(props: { code_snippet: string }) {
  const code_snippet = props.code_snippet;
  const md_to_show = ["```", code_snippet, "```"].join("\n");
  return (
    <Detail
      markdown={md_to_show}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard content={code_snippet} />
        </ActionPanel>
      }
    />
  );
}

export default function main() {
  const algoliaClient = useMemo(() => {
    return algoliasearch(APPID, APIKEY);
  }, [APPID, APIKEY]);

  const algoliaIndex = useMemo(() => {
    return algoliaClient.initIndex(INDEX);
  }, [algoliaClient, INDEX]);

  const [searchText, setSearchText] = useState("");
  const { isLoading, data: searchResults } = useCachedPromise(
    async (query: string) => {
      const res = await algoliaIndex.search<DocSearchHit>(query);
      return res.hits;
    },
    [searchText],
    {
      failureToastOptions: {
        title: "Algolia Error",
      },
    },
  );

  return (
    <List throttle={true} isLoading={isLoading} onSearchTextChange={setSearchText}>
      {searchResults?.map((result) => (
        <List.Item
          key={result.objectID}
          title={
            result.hierarchy.lvl2
              ? result.hierarchy.lvl2.replace("'", "'").replace(/&amp;/g, "&")
              : result.hierarchy.lvl3
                ? result.hierarchy.lvl3.replace("'", "'").replace(/&amp;/g, "&")
                : result.hierarchy.lvl1
                  ? result.hierarchy.lvl1.replace("'", "'").replace(/&amp;/g, "&")
                  : ""
          }
          subtitle={
            result.hierarchy.lvl2 || result.hierarchy.lvl3
              ? [result.hierarchy.lvl0, result.hierarchy.lvl1].join(" > ").replace(/&amp;/g, "&")
              : (result.hierarchy.lvl0 || "").replace(/&amp;/g, "&")
          }
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={result.url} title="Open in Browser" />
              <Action.CopyToClipboard content={result.url} title="Copy URL" />
              <Action.Push
                title="Show Code Snippets"
                icon={Icon.AppWindowList}
                target={<ListCodeSnippets url={result.url} />}
                // eslint-disable-next-line @raycast/prefer-common-shortcut
                shortcut={{
                  macOS: { modifiers: ["cmd", "shift"], key: "s" },
                  Windows: { modifiers: ["ctrl", "shift"], key: "s" },
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
