import { ActionPanel, Action, List, showToast, Toast } from "@raycast/api";
import { useFetch, Response } from "@raycast/utils";

export default function Command() {
  const { data, isLoading } = useFetch("https://ui.shadcn.com/api/components", {
    parseResponse: parseFetchResponse,
  });

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search components...">
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
      subtitle={searchResult.component}
      icon="shadcn-icon.png"
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open in Browser" url={searchResult.url} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              icon="npm-icon.png"
              title="Copy Add Component [Npm]"
              content={`npx shadcn-ui add ${searchResult.component}`}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
            />
            <Action.CopyToClipboard
              icon="yarn-icon.png"
              title="Copy Add Component [Yarn]"
              content={`npx shadcn-ui add ${searchResult.component}`}
              shortcut={{ modifiers: ["cmd"], key: "y" }}
            />
            <Action.CopyToClipboard
              icon="pnpm-icon.png"
              title="Copy Add Component [Pnpm]"
              content={`pnpx shadcn-ui add ${searchResult.component}`}
              shortcut={{ modifiers: ["cmd"], key: "p" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

/** Parse the response from the fetch query into something we can display */
async function parseFetchResponse(response: Response) {
  const json = (await response.json()) as
    | {
        name: string;
        component: string;
      }[]
    | { code: string; message: string };

  if (!response.ok || "message" in json) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Request failed 🔴",
      message: "Please try again later 🙏",
    });
    throw new Error("message" in json ? json.message : response.statusText);
  }

  return json.map((result) => {
    return {
      name: result.name,
      component: result.component,
      url: `https://ui.shadcn.com/docs/components/${result.component}`,
    } as SearchResult;
  });
}

interface SearchResult {
  name: string;
  component: string;
  url: string;
}
