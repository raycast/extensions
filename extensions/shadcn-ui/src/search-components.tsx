import { ActionPanel, Action, List, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { SHADCN_URL } from "./constants";
import fetch, { type Response } from "node-fetch";
import yaml from "js-yaml";

/**
 * Function to parse a component name
 * Replaces - with empty space and capitalizes the first letter of each word
 */
export const parseComponentName = (componentName: string) => {
  return componentName
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const onRequestError = async (e: Error) => {
  await showToast({
    style: Toast.Style.Failure,
    title: "Request failed 🔴",
    message: e.message || "Please try again later 🙏",
  });
};

/*
 /$$       /$$             /$$
| $$      |__/            | $$
| $$       /$$  /$$$$$$$ /$$$$$$
| $$      | $$ /$$_____/|_  $$_/
| $$      | $$|  $$$$$$   | $$
| $$      | $$ \____  $$  | $$ /$$
| $$$$$$$$| $$ /$$$$$$$/  |  $$$$/
|________/|__/|_______/    \___/
*/

async function parseFetchResponse(response: Response) {
  const json = (await response.json()) as
    | {
        name: string;
      }[]
    | { code: string; message: string };

  if (!response.ok || "message" in json) {
    throw new Error("message" in json ? json.message : response.statusText);
  }

  console.log(json);

  return json.map((result) => {
    return {
      name: parseComponentName(result.name),
      component: result.name,
      url: `${SHADCN_URL.DOCS_COMPONENTS}/${result.name}`,
    } as SearchResult;
  });
}

export default function SearchComponents() {
  const { isLoading, data } = useCachedPromise(
    async (url: string) => {
      const response = await fetch(url);

      return await parseFetchResponse(response);
    },
    [SHADCN_URL.API_COMPONENTS],
    {
      keepPreviousData: true,
      onError: onRequestError,
    }
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search components..." isShowingDetail>
      {data?.map((searchResult) => (
        <SearchListItem key={searchResult.name} searchResult={searchResult} />
      ))}
    </List>
  );
}

/*
 /$$$$$$$              /$$               /$$ /$$
| $$__  $$            | $$              |__/| $$
| $$  \ $$  /$$$$$$  /$$$$$$    /$$$$$$  /$$| $$
| $$  | $$ /$$__  $$|_  $$_/   |____  $$| $$| $$
| $$  | $$| $$$$$$$$  | $$      /$$$$$$$| $$| $$
| $$  | $$| $$_____/  | $$ /$$ /$$__  $$| $$| $$
| $$$$$$$/|  $$$$$$$  |  $$$$/|  $$$$$$$| $$| $$
|_______/  \_______/   \___/   \_______/|__/|__/
*/

interface SearchResult {
  name: string;
  component: string;
  url: string;
}

function SearchListItem({ searchResult }: { searchResult: SearchResult }) {
  const { isLoading, data: detailData } = useCachedPromise(
    async (url: string) => {
      const response = await fetch(url);
      return await parseFetchDetailResponse(response);
    },
    [`${SHADCN_URL.RAW_GITHUB_COMPONENTS}/${searchResult.component}.mdx`],
    {
      keepPreviousData: true,
      onError: onRequestError,
    }
  );

  return (
    <List.Item
      title={searchResult.name}
      detail={
        <List.Item.Detail
          isLoading={isLoading}
          markdown={!detailData ? "# NA" : `# ${detailData.title}\n## ${detailData.description}`}
          metadata={
            !!detailData?.radix && (
              <List.Item.Detail.Metadata>
                {detailData.radix.link && (
                  <List.Item.Detail.Metadata.Link title="Radix UI" target={detailData.radix.link} text="Radix UI" />
                )}
                <List.Item.Detail.Metadata.Separator />
                {detailData.radix.api && (
                  <List.Item.Detail.Metadata.Link
                    title="API Reference"
                    target={detailData.radix.api}
                    text="Radix API Reference"
                  />
                )}
              </List.Item.Detail.Metadata>
            )
          }
        />
      }
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

interface FrontMatter {
  title: string;
  description: string;
  component: boolean;
  radix: {
    link: string;
    api: string;
  };
}

function parseFrontMatter(str: string): FrontMatter {
  const regex = /^---\n(?<yaml>[\s\S]*?)\n---\n(?<content>[\s\S]*)$/;
  const match = str.match(regex);

  if (!match) {
    throw new Error("Invalid front matter format");
  }

  const { yaml: yamlStr, content } = match.groups || {};
  const frontMatter = yamlStr ? yamlStr.trim() : "";
  const clean = (frontMatter && yaml.load(frontMatter)) || {};

  return {
    ...clean,
    ...(content && { content }),
  } as FrontMatter;
}

/** Parse the response from the fetch query into something we can display */
async function parseFetchDetailResponse(response: Response) {
  const mdx = await response.text();

  if (!response.ok) {
    throw new Error(response.statusText);
  }

  return parseFrontMatter(mdx);
}
