import { ActionPanel, List, Action, showToast, Toast, Detail, Icon } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import algoliasearch from "algoliasearch/lite";
import { load } from "cheerio";
import fetch from "node-fetch";

const APPID = "57ZWAOQC7F";
const APIKEY = "04a5092253f5120fdff2c77b3847d0e1";
const INDEX = "dbt";

export function ListCodeSnippets(props: { url: string }) {
  const url = props.url;
  const [listSnippets, setListSnippets] = useState<Array<string>>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  async function fetchSnippets() {
    await fetch(url, { method: "GET" })
      .then((response) => {
        if (!response.ok) {
          showToast(Toast.Style.Failure, "HTTP error", response.statusText);
        }
        return response.text();
      })

      .then((responseText) => {
        const $ = load(responseText);
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

        setListSnippets(listSnippetsQuery);
        setIsLoading(false);
      })

      .catch((error) => {
        showToast(Toast.Style.Failure, "Issue parsing the documentation page");
        setListSnippets([]);
        setIsLoading(false);
      });
  }

  useEffect(() => {
    fetchSnippets();
  }, [url]);

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
                <Action.OpenInBrowser
                  url={url}
                  title="Open Page in Browser"
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                />
                <Action.CopyToClipboard content={url} title="Copy Page URL" />
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

  const [searchResults, setSearchResults] = useState<any[] | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  const search = async (query = "") => {
    setIsLoading(true);

    return await algoliaIndex
      .search(query)
      .then((res) => {
        setIsLoading(false);
        return res.hits;
      })
      .catch((err) => {
        setIsLoading(false);
        showToast(Toast.Style.Failure, "Algolia Error", err.message);
        return [];
      });
  };

  useEffect(() => {
    (async () => setSearchResults(await search()))();
  }, []);

  return (
    <List
      throttle={true}
      isLoading={isLoading || searchResults === undefined}
      onSearchTextChange={async (query) => setSearchResults(await search(query))}
    >
      {searchResults?.map((result) => (
        <List.Item
          key={result.objectID}
          title={
            result.hierarchy.lvl2 || result.hierarchy.lvl3
              ? (result.hierarchy.lvl2 || result.hierarchy.lvl3).replace("'", "'").replace(/&amp;/g, "&")
              : result.hierarchy.lvl1
              ? result.hierarchy.lvl1.replace("'", "'").replace(/&amp;/g, "&")
              : ""
          }
          subtitle={
            result.hierarchy.lvl2 || result.hierarchy.lvl3
              ? [result.hierarchy.lvl0, result.hierarchy.lvl1].join(" > ").replace(/&amp;/g, "&")
              : result.hierarchy.lvl0.replace(/&amp;/g, "&")
          }
          actions={
            <ActionPanel title={result.name}>
              <Action.OpenInBrowser url={result.url} title="Open in Browser" />
              <Action.CopyToClipboard content={result.url} title="Copy URL" />
              <Action.Push
                title="Show Code Snippets"
                icon={Icon.AppWindowList}
                target={<ListCodeSnippets url={result.url} />}
                shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
