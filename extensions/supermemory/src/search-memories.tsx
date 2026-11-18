import {
  ActionPanel,
  Detail,
  List,
  Action,
  Icon,
  showToast,
  Toast,
  Keyboard,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useState } from "react";
import {
  fetchProjects,
  removeMemory,
  searchMemories,
  type SearchResult,
} from "./api";
import { useCachedPromise, usePromise } from "@raycast/utils";
import { withSupermemory } from "./withSupermemory";

const extractContent = (memory: SearchResult) => {
  if (memory.chunks && memory.chunks.length > 0) {
    return memory.chunks
      .map((chunk: unknown) => {
        if (typeof chunk === "string") return chunk;
        if (
          chunk &&
          typeof chunk === "object" &&
          "content" in chunk &&
          typeof chunk.content === "string"
        )
          return chunk.content;
        if (
          chunk &&
          typeof chunk === "object" &&
          "text" in chunk &&
          typeof chunk.text === "string"
        )
          return chunk.text;
        return "";
      })
      .filter(Boolean)
      .join(" ");
  }
  return "No content available";
};

const extractUrl = (memory: SearchResult) => {
  if (memory.metadata?.url && typeof memory.metadata.url === "string") {
    return memory.metadata.url;
  }
  return null;
};

export default withSupermemory(Command);
function Command() {
  const [searchText, setSearchText] = useState("");
  const [filter, setFilter] = useState("");

  const { isLoading: isLoadingProjects, data: projects } =
    useCachedPromise(fetchProjects);
  const {
    isLoading,
    data: searchResults = [],
    mutate,
  } = usePromise(
    async (query: string, containerTag: string) => {
      const q = query.trim();
      if (!q) return [];

      const results = await searchMemories({
        q,
        limit: 50,
        containerTags: containerTag ? [containerTag] : undefined,
      });
      if (!results.length) {
        await showToast({
          style: Toast.Style.Success,
          title: "Search Complete",
          message: "No memories found for your query",
        });
      }
      return results;
    },
    [searchText, filter],
  );

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Unknown date";
    }
  };

  const truncateContent = (content: string, maxLength = 100) => {
    if (content.length <= maxLength) return content;
    return `${content.substring(0, maxLength)}...`;
  };

  const confirmAndRemoveMemory = async (memory: SearchResult) => {
    const options: Alert.Options = {
      icon: Icon.Trash,
      title: "Remove Memory",
      message: "Are you sure you want to remove this memory?",
      primaryAction: {
        style: Alert.ActionStyle.Destructive,
        title: "Remove",
      },
    };

    if (await confirmAlert(options)) {
      try {
        await mutate(removeMemory({ id: memory.documentId }), {
          optimisticUpdate(data) {
            return (data || []).filter(
              (m) => m.documentId !== memory.documentId,
            );
          },
          shouldRevalidateAfter: false,
        });
      } catch (error) {
        console.error(error);
      }
    }
  };

  const hasSearched = !isLoading && !searchResults.length;
  return (
    <List
      isLoading={isLoading || isLoadingProjects}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search your memories..."
      throttle
      searchBarAccessory={
        <List.Dropdown tooltip="Filter" onChange={setFilter}>
          <List.Dropdown.Item icon="extension-icon.png" title="All" value="" />
          {projects?.map((project) => (
            <List.Dropdown.Item
              key={project.id}
              icon="extension-icon.png"
              title={project.name}
              value={project.containerTag}
            />
          ))}
        </List.Dropdown>
      }
    >
      {hasSearched && !searchText.trim() ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Search Your Memories"
          description="Type to search through your Supermemory collection"
        />
      ) : hasSearched ? (
        <List.EmptyView
          icon={Icon.Document}
          title="No Memories Found"
          description={`No memories found for "${searchText}"`}
        />
      ) : isLoading && searchText.trim() ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Searching Your Memories"
        />
      ) : (
        searchResults.map((memory) => {
          const content = extractContent(memory);
          const url = extractUrl(memory);
          return (
            <List.Item
              key={memory.documentId}
              icon={url ? Icon.Link : Icon.Document}
              title={memory.title || "Untitled Memory"}
              subtitle={{ value: truncateContent(content), tooltip: content }}
              accessories={[
                { text: formatDate(memory.createdAt) },
                ...(memory.score
                  ? [{ text: `${Math.round(memory.score * 100)}%` }]
                  : []),
              ]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="View Details"
                    target={<MemoryDetail memory={memory} />}
                    icon={Icon.Eye}
                  />
                  <Action.CopyToClipboard
                    title="Copy Content"
                    shortcut={{
                      macOS: { modifiers: ["cmd"], key: "c" },
                      Windows: { modifiers: ["ctrl"], key: "c" },
                    }}
                    content={content}
                  />
                  {url && (
                    <Action.OpenInBrowser
                      title="Open URL"
                      url={url}
                      shortcut={Keyboard.Shortcut.Common.Open}
                    />
                  )}
                  <Action
                    icon={Icon.Trash}
                    title="Remove Memory"
                    onAction={() => confirmAndRemoveMemory(memory)}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                    style={Action.Style.Destructive}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}

function MemoryDetail({ memory }: { memory: SearchResult }) {
  const content = extractContent(memory);
  const url = extractUrl(memory);

  const markdown = `
# ${memory.title || "Untitled Memory"}

${content}

---

**Created:** ${new Date(memory.createdAt).toLocaleString()}
${url ? `**URL:** ${url}` : ""}
${memory.score ? `**Relevance:** ${Math.round(memory.score * 100)}%` : ""}
`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Content"
            shortcut={{
              macOS: { modifiers: ["cmd"], key: "c" },
              Windows: { modifiers: ["ctrl"], key: "c" },
            }}
            content={content}
          />
          {url && (
            <Action.OpenInBrowser
              title="Open URL"
              url={url}
              shortcut={Keyboard.Shortcut.Common.Open}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
