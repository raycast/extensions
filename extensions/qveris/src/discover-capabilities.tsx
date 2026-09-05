import { randomUUID } from "node:crypto";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { ToolDetail } from "./components/tool-detail";
import { discoverCapabilities } from "./lib/api";
import { formatCost, formatReliability } from "./lib/format";
import type { SearchResponse } from "./lib/types";

export default function DiscoverCapabilities() {
  const [searchText, setSearchText] = useState("");
  const [response, setResponse] = useState<SearchResponse>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);
  const sessionId = useRef(randomUUID());

  useEffect(() => {
    const query = searchText.trim();
    if (!query) {
      setResponse(undefined);
      setError(undefined);
      setIsLoading(false);
      return;
    }

    let active = true;
    const timer = setTimeout(async () => {
      setIsLoading(true);
      setError(undefined);
      try {
        const next = await discoverCapabilities({ query, limit: 20, sessionId: sessionId.current });
        if (active) setResponse(next);
      } catch (requestError) {
        if (active) {
          setResponse(undefined);
          setError(requestError instanceof Error ? requestError.message : "Unable to search QVeris.");
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }, 350);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searchText]);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Describe the capability you need…"
      onSearchTextChange={setSearchText}
      throttle
    >
      {!searchText.trim() ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Discover QVeris Capabilities"
          description="Describe a task, such as “weather forecast API” or “search recent AI news”."
        />
      ) : error ? (
        <List.EmptyView icon={Icon.Warning} title="Search Failed" description={error} />
      ) : !isLoading && response?.results.length === 0 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No Capabilities Found"
          description="Try a broader task description."
        />
      ) : (
        response?.results.map((tool) => (
          <List.Item
            key={tool.tool_id}
            icon="icon.png"
            title={tool.name ?? tool.capability ?? tool.tool_id}
            subtitle={tool.provider_name}
            accessories={[{ text: formatCost(tool) }, { tag: formatReliability(tool) }]}
            detail={<List.Item.Detail markdown={toolDetailMarkdown(tool)} />}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Capability"
                  icon={Icon.Sidebar}
                  target={<ToolDetail tool={tool} searchId={response.search_id} />}
                />
                <Action.CopyToClipboard title="Copy Tool ID" icon={Icon.Clipboard} content={tool.tool_id} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function toolDetailMarkdown(tool: SearchResponse["results"][number]) {
  return `# ${tool.name ?? tool.capability ?? tool.tool_id}\n\n${tool.description ?? "No description provided."}\n\n**Tool ID:** \`${tool.tool_id}\``;
}
