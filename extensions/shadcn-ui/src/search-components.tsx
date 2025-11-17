import { ActionPanel, Action, List, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { CREATE_ERROR_TOAST_OPTIONS, SHADCN_URL } from "./constants";
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

/**
 * Fetch the list of components directly from the shadcn/ui GitHub repo
 */
async function getComponentsFromGitHub(): Promise<SearchResult[]> {
  // GitHub API for directory listing
  const res = await fetch("https://api.github.com/repos/shadcn/ui/contents/apps/www/content/docs/components");
  if (!res.ok) {
    throw new Error(res.statusText);
  }
  const files = (await res.json()) as Array<{ name: string; type: string }>;
  return files
    .filter((file) => file.type === "file" && file.name.endsWith(".mdx"))
    .map((file) => {
      const component = file.name.replace(/\.mdx$/, "");
      return {
        name: parseComponentName(component),
        component,
        url: `${SHADCN_URL.DOCS_COMPONENTS}/${component}`,
      } as SearchResult;
    });
}

export default function SearchComponents() {
  const { isLoading, data } = useCachedPromise(getComponentsFromGitHub, [], {
    keepPreviousData: true,
    onError: async (e) => {
      await showToast(CREATE_ERROR_TOAST_OPTIONS(e));
    },
  });

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
      onError: async (e) => {
        await showToast(CREATE_ERROR_TOAST_OPTIONS(e));
      },
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
            !!detailData?.links && (
              <List.Item.Detail.Metadata>
                {detailData.links.doc && (
                  <List.Item.Detail.Metadata.Link title="Radix UI" target={detailData.links.doc} text="Radix UI" />
                )}
                <List.Item.Detail.Metadata.Separator />
                {detailData.links.api && (
                  <List.Item.Detail.Metadata.Link
                    title="API Reference"
                    target={detailData.links.api}
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
              content={`npx shadcn@latest add ${searchResult.component}`}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
            />
            <Action.CopyToClipboard
              icon="yarn-icon.png"
              title="Copy Add Component [Yarn]"
              content={`npx shadcn@latest add ${searchResult.component}`}
              shortcut={{ modifiers: ["cmd"], key: "y" }}
            />
            <Action.CopyToClipboard
              icon="pnpm-icon.png"
              title="Copy Add Component [Pnpm]"
              content={`pnpm dlx shadcn@latest add ${searchResult.component}`}
              shortcut={{ modifiers: ["cmd", "ctrl"], key: "p" }}
            />
            <Action.CopyToClipboard
              icon="bun-icon.png"
              title="Copy Add Component [Bun]"
              content={`bunx --bun shadcn@latest add ${searchResult.component}`}
              shortcut={{ modifiers: ["cmd"], key: "b" }}
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
  links: {
    doc: string;
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
