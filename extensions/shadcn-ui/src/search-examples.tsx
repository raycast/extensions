import { ActionPanel, Action, List, showToast } from "@raycast/api";
import { Octokit } from "octokit";
import { CREATE_ERROR_TOAST_OPTIONS, OCTOKIT_CONFIG, SHADCN_URL } from "./constants";
import { useCachedPromise } from "@raycast/utils";

const getData = async () => {
  const res = (await new Octokit().rest.repos.getContent({
    mediaType: { format: "json" },
    owner: OCTOKIT_CONFIG.owner,
    repo: OCTOKIT_CONFIG.repo,
    path: OCTOKIT_CONFIG.pathExamples,
  })) as { data: SearchResult[] };

  const data = res.data
    .filter((res: { name: string }) => !res.name.includes(".tsx"))
    .map(({ name, path }) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      url: `${SHADCN_URL.EXAMPLES}/${name}`,
      path: `${SHADCN_URL.GITHUB}/${path}`,
    }));

  return data;
};

interface SearchResult {
  name: string;
  url: string;
  path: string;
}

export default function SearchExamples() {
  const { isLoading, data } = useCachedPromise(getData, [], {
    keepPreviousData: true,
    onError: async (e) => {
      await showToast(CREATE_ERROR_TOAST_OPTIONS(e));
    },
  });

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search examples...">
      {data?.map((searchResult) => (
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
            <Action.OpenInBrowser title="Open in GitHub" url={searchResult.path} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
