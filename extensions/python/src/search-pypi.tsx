import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { PackageListItem } from "./components/PackageListItem";
import { Package } from "./types";

interface DoltPackageRow {
  name: string;
  summary: string;
  version: string;
}

export default function PackageList() {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const abortable = useRef<AbortController | undefined>(undefined);

  const { isLoading, data, revalidate } = usePromise(
    async (): Promise<Package[]> => {
      const url = `https://www.dolthub.com/api/v1alpha1/iloveitaly/pypi/main?q=SELECT+*+FROM+%60projects%60+WHERE+name+LIKE+%27${searchTerm}%25%27+LIMIT+50%3B`;
      const response = await fetch(url);
      const packageJsonResponse = (await response.json()) as { rows: DoltPackageRow[] };

      /*
      {
        "commit_ref": "main",
        "query_execution_message": "",
        "query_execution_status": "Success",
        "repository_name": "pypi",
        "repository_owner": "iloveitaly",
        "rows": [
            {
                "author": "",
                "author_email": "Michael Bianco <mike@mikebian.co>",
                "classifiers": "[]",
                "home_page": "",
                "id": "84720",
                "license": "",
                "maintainer": "",
                "maintainer_email": "",
                "name": "aiautocommit",
                "package_url": "https://pypi.org/project/aiautocommit/",
                "platform": "",
                "project_url": "https://pypi.org/project/aiautocommit/",
                "requires_dist": "[\"click>=8.1.7\",\"openai>=1.54.3\"]",
                "requires_python": ">=3.8",
                "summary": "AI generated commit messages",
                "version": "0.12.0",
                "yanked": "0",
                "yanked_reason": ""
            }
        ],
        "schema": [
            {
                "columnName": "id",
                "columnType": "int"
            },
            {
                "columnName": "name",
                "columnType": "text COLLATE utf8mb4_general_ci"
            },
            ...
        ],
        "sql_query": "SELECT * FROM `projects` WHERE name LIKE 'aiauto%' LIMIT 1000;"
        }
       */

      return packageJsonResponse["rows"].map((row: DoltPackageRow) => {
        return {
          name: row.name,
          description: row.summary,
          version: row.version,
        } as Package;
      });
    },
    [],
    { abortable, execute: !!searchTerm },
  );

  const debounced = useDebouncedCallback(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async (_searchTerm: string) => {
      revalidate();
    },
    600,
    { debounceOnServer: true },
  );

  useEffect(() => {
    if (searchTerm) {
      debounced(searchTerm);
    } else {
      revalidate();
    }
  }, [searchTerm]);

  return (
    <List
      searchText={searchTerm}
      isLoading={isLoading}
      searchBarPlaceholder={`Search packages, like "fastapi"…`}
      onSearchTextChange={setSearchTerm}
    >
      {searchTerm ? (
        <>
          {data?.length ? (
            <>
              <List.Item
                title={`View search results for "${searchTerm}" on pypi.org`}
                icon={Icon.MagnifyingGlass}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser
                      url={`https://pypi.org/search?q=${searchTerm}`}
                      title="View PyPI Search Results"
                    />
                  </ActionPanel>
                }
              />
              <List.Section title="Results" subtitle={data.length.toString()}>
                {data.map((result) => {
                  return <PackageListItem key={result.name} pkg={result} />;
                })}
              </List.Section>
            </>
          ) : null}
        </>
      ) : null}
    </List>
  );
}
