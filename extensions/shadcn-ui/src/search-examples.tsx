import { ActionPanel, Action, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { Octokit } from "octokit";
import { OCTOKIT_CONFIG, SHADCN_URL } from "./constants";

interface SearchResult {
  name: string;
  url: string;
}

export default function SearchExamples() {
  const [data, setData] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const getData = async () => {
      try {
        const octokit = new Octokit();

        const res = (await octokit.rest.repos.getContent({
          mediaType: { format: "json" },
          owner: OCTOKIT_CONFIG.owner,
          repo: OCTOKIT_CONFIG.repo,
          path: OCTOKIT_CONFIG.pathExamples,
        })) as { data: SearchResult[] };

        setData(
          res.data
            .filter((res: { name: string }) => !res.name.includes(".tsx"))
            .map((e) => ({
              name: e.name.charAt(0).toUpperCase() + e.name.slice(1),
              url: `${SHADCN_URL.EXAMPLES}/${e.name}`,
            }))
        );
      } catch (e) {
        const message = e instanceof Error ? e.message : "Please try again later 🙏";

        await showToast({
          style: Toast.Style.Failure,
          title: "Request failed 🔴",
          message,
        });
      } finally {
        setIsLoading(false);
      }
    };

    getData();
  }, []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search examples...">
      {data.map((searchResult: SearchResult) => (
        <SearchListItem key={searchResult.name} searchResult={searchResult} />
      ))}
    </List>
  );
}

function SearchListItem({ searchResult }: { searchResult: SearchResult }) {
  return (
    <List.Item
      title={searchResult.name}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open in Browser" url={searchResult.url} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
