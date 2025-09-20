import { useState } from "react";
import { XMLParser } from "fast-xml-parser";
import { useAI, useFetch } from "@raycast/utils";
import { ActionPanel, Action, List, Icon, environment, AI, Detail } from "@raycast/api";

export default function Command() {
  const [searchText, setSearchText] = useState("");

  const { data, isLoading } = useFetch(`https://developer.wordpress.org/search/${searchText}/feed/rss/`, {
    parseResponse: parseFetchResponse,
    execute: searchText.length > 0,
  });

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search WordPress code reference..."
      throttle
    >
      {searchText.length > 0 ? (
        <List.Section title="Results" subtitle={data?.length + ""}>
          {data?.map((searchResult: SearchResult) => (
            <SearchListItem key={searchResult.name} searchResult={searchResult} />
          ))}
        </List.Section>
      ) : (
        <List.Section>
          {defaultLinks().map((searchResult: SearchResult) => (
            <SearchListItem key={searchResult.name} searchResult={searchResult} />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function defaultLinks() {
  return [
    {
      name: "Code Reference",
      description: "Looking for documentation for the codebase?",
      url: "https://developer.wordpress.org/reference",
    } as SearchResult,
    {
      name: "Coding Standards",
      description: "Looking to ensure your code meets the standards?",
      url: "https://developer.wordpress.org/coding-standards/",
    } as SearchResult,
    {
      name: "Common APIs",
      description: "Interested in interacting with various APIs?",
      url: "https://developer.wordpress.org/apis/",
    } as SearchResult,
    {
      name: "REST API",
      description: "Getting started on making WordPress applications?",
      url: "https://developer.wordpress.org/rest-api/",
    } as SearchResult,
    {
      name: "WP CLI",
      description: "Want to accelerate your workflow managing WordPress?",
      url: "https://developer.wordpress.org/cli/commands/",
    } as SearchResult,
    {
      name: "Plugin Handbook",
      description: "Ready to dive deep into the world of plugin authoring?",
      url: "https://developer.wordpress.org/cli/commands/",
    } as SearchResult,
    {
      name: "Theme Handbook",
      description: "Want to learn how to start theming WordPress?",
      url: "https://developer.wordpress.org/cli/commands/",
    } as SearchResult,
  ];
}

function SearchListItem({ searchResult }: { searchResult: SearchResult }) {
  return (
    <List.Item
      title={searchResult.name}
      subtitle={searchResult.description}
      accessories={searchResult.type ? [{ icon: Icon.Code, text: searchResult.type }] : null}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <DefaultActions searchResult={searchResult} />
            {environment.canAccess(AI) && (
              <Action.Push
                title="View Summary"
                icon={Icon.Paragraph}
                shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                target={<Summary searchResult={searchResult} />}
              />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function DefaultActions({ searchResult }: { searchResult: SearchResult }) {
  return (
    <>
      <Action.OpenInBrowser title="Open in Browser" url={searchResult.url} />
      <Action.CopyToClipboard title="Copy URL to Clipboard" content={searchResult.url} />
    </>
  );
}

function Summary({ searchResult }: { searchResult: SearchResult }) {
  const item = JSON.stringify(searchResult);
  const prompt = `Summarize the following from the WordPress documentation and give one example of usage in a code block. Add the language to the code block like \`\`\`php. The context can only be about WordPress. Format the response as if you are providing documentation:\n${item}`;
  const { data, isLoading } = useAI(prompt, { creativity: 0 });
  const code = data.match(/```[\w\S]*\n([\s\S]*?)\n```/);

  return (
    <Detail
      navigationTitle="AI Generated Summary"
      isLoading={isLoading}
      markdown={data}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser
              title="Continue in Chat"
              icon={Icon.SpeechBubble}
              url={`raycast://extensions/raycast/raycast-ai/ai-chat?fallbackText=${encodeURIComponent(prompt)}`}
            />
            <DefaultActions searchResult={searchResult} />
            <Action.CopyToClipboard
              shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
              title="Copy Summary To Clipboard"
              content={data}
            />
            {code?.[1] ? (
              <Action.CopyToClipboard
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                title="Copy Snippet To Clipboard"
                content={code[1].replace(/`{3}/g, "")}
              />
            ) : null}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

async function parseFetchResponse(response: Response) {
  const data = await response.text();

  if (!response.ok) {
    throw new Error(response.statusText);
  }

  const xml = new XMLParser();
  const result = xml.parse(data);

  if (response.redirected) {
    const parts = response.url
      .split("/")
      .filter((part) => part)
      .reverse();

    return [
      {
        name: parts[0],
        description: "",
        type: parts[1].slice(0, -1),
        url: response.url,
      } as SearchResult,
    ];
  }

  if (!result.rss || !result.rss.channel || !result.rss.channel.item) {
    return null;
  }

  return result.rss.channel.item.map((match: RssItem) => {
    const text = match.description.replace(/(<([^>]+)>)/gi, "");
    const type = text.substring(0, text.indexOf(":")).trim();
    const description = text.substring(text.indexOf(":") + 1).trim();

    return {
      name: match.title,
      description: description,
      type: type,
      url: match.link,
    } as SearchResult;
  });
}

interface SearchResult {
  name: string;
  description: string;
  type: string;
  url: string;
}

interface RssItem {
  title: string;
  description: string;
  link: string;
  url: string;
}
