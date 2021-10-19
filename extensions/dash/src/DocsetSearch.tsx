import { List, ActionPanel, ActionPanelItem, closeMainWindow } from "@raycast/api";
import { exec, execSync } from "child_process";
import { useState, useEffect } from "react";
import { getDashAppPath } from "./util/dashApp";
import { Docset } from "./util/docsets";
import { parse } from "fast-xml-parser";

type DashResult = {
  title: string;
  subtitle: string[];
  icon: string;
  quicklookurl: string;
  "@_uid": string;
};

async function searchDash(query: string): Promise<DashResult[]> {
  return new Promise((resolve, reject) => {
    exec(
      `./dashAlfredWorkflow ${query}`,
      {
        cwd: `${getDashAppPath()}/Contents/Resources`,
      },
      (err, data) => {
        if (err) reject(err);

        const jsonData = parse(data, { ignoreAttributes: false });

        if (jsonData.output !== undefined) {
          if (Array.isArray(jsonData.output.items.item)) {
            resolve(jsonData.output.items.item);
          } else {
            resolve([ jsonData.output.items.item ]);
          }
        } else {
          resolve([]);
        }
      }
    );
  });
}

export default function DocsetSearch({ docset }: { docset: Docset }) {
  const [isLoading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<DashResult[]>([]);

  async function fetchDashResults() {
    setLoading(true);
    if (searchText.length) {
      setResults(await searchDash(`${docset.docsetKeyword}:${searchText}`));
    } else {
      setResults([]);
    }

    setLoading(false);
  }

  useEffect(() => {
    fetchDashResults();
  }, [searchText]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={`Search in ${docset.docsetName}`}
      onSearchTextChange={setSearchText}
    >
      {results.map((result) => (
        <List.Item
          key={result["@_uid"]}
          title={result.title}
          subtitle={result.subtitle[2]}
          icon={result.icon}
          actions={
            <ActionPanel>
              <ActionPanelItem
                id="openDocSet"
                title="Open in Dash"
                onAction={() => {
                  execSync(`open dash://${docset.docsetKeyword}:"${result.title}"`);
                  closeMainWindow({ clearRootSearch: true });
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
