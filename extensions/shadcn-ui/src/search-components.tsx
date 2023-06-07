import { ActionPanel, Action, List, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import fetch, { type Response } from "node-fetch";
import yaml from "js-yaml";

export default function Command() {
  const { isLoading, data } = useCachedPromise(
    async (url: string) => {
      const response = await fetch(url);
      return await parseFetchResponse(response);
    },
    ["https://ui.shadcn.com/api/components"],
    {
      keepPreviousData: true,
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

function SearchListItem({ searchResult }: { searchResult: SearchResult }) {
  const { isLoading, data: detailData } = useCachedPromise(
    async (url: string) => {
      const response = await fetch(url);
      return await parseFetchDetailResponse(response);
    },
    [`https://raw.githubusercontent.com/shadcn/ui/main/apps/www/content/docs/components/${searchResult.component}.mdx`],
    {
      keepPreviousData: true,
    }
  );

  return (
    <List.Item
      title={searchResult.name}
      icon="shadcn-icon.png"
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
    await showToast({
      style: Toast.Style.Failure,
      title: "Request failed 🔴",
      message: "Please try again later 🙏",
    });
    throw new Error(response.statusText);
  }

  return parseFrontMatter(mdx);
}

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
