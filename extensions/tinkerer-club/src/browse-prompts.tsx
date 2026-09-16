import { Action, ActionPanel, Icon, List, Toast, showToast } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { getApiClient } from "./api/preferences";
import { PromptDetail } from "./components/prompt-detail";
import { useDebouncedValue } from "./hooks/use-debounced-value";
import { errorMessage } from "./lib/json";
import { parsePromptDisplay, PromptDisplay } from "./lib/prompt";
import { toDisplayItems } from "./lib/results";
import { PromptListInput, PromptView } from "./types/api";

const PROMPT_LIST = { path: "prompt.list", type: "query" } as const;

export default function BrowsePromptsCommand() {
  const client = useMemo(() => getApiClient(), []);
  const [searchText, setSearchText] = useState("");
  const [view, setView] = useState<PromptView>("EXPLORE");
  const [prompts, setPrompts] = useState<PromptDisplay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [failure, setFailure] = useState<string>();
  const [revision, setRevision] = useState(0);
  const query = useDebouncedValue(searchText.trim().slice(0, 120), 250);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setIsLoading(true);
      setFailure(undefined);
      const input: PromptListInput = {
        limit: 60,
        page: 1,
        sort: view === "EXPLORE" ? "POPULAR" : "NEWEST",
        view,
        ...(query ? { query } : {}),
      };

      try {
        const result = await client.call(PROMPT_LIST, input, controller.signal);
        setPrompts(
          toDisplayItems(result, client.baseUrl).map((item, index) =>
            parsePromptDisplay(item.value, index, client.baseUrl),
          ),
        );
      } catch (error) {
        if (controller.signal.aborted) return;
        const message = errorMessage(error);
        setFailure(message);
        setPrompts([]);
        await showToast({ style: Toast.Style.Failure, title: "Could Not Load Prompts", message });
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [client, query, revision, view]);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search prompts by title, content, author, or topic"
      throttle
      searchBarAccessory={
        <List.Dropdown tooltip="Prompt Library" value={view} onChange={(value) => setView(value as PromptView)}>
          <List.Dropdown.Item title="Explore" value="EXPLORE" icon={Icon.Globe} />
          <List.Dropdown.Item title="Saved" value="SAVED" icon={Icon.Bookmark} />
          <List.Dropdown.Item title="Mine" value="MINE" icon={Icon.Person} />
        </List.Dropdown>
      }
    >
      {prompts.map((prompt, index) => (
        <List.Item
          key={prompt.id ?? `${prompt.title}:${index}`}
          icon={prompt.kind === "IMAGE" || prompt.kind === "VIDEO" ? Icon.Image : Icon.Text}
          title={prompt.title}
          {...((prompt.description ?? prompt.author) ? { subtitle: prompt.description ?? prompt.author } : {})}
          accessories={[
            ...(prompt.kind ? [{ tag: prompt.kind.replaceAll("_", " ") }] : []),
            ...(prompt.author && prompt.description ? [{ text: prompt.author }] : []),
            ...(prompt.saved ? [{ icon: Icon.Bookmark }] : []),
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                title="View Prompt"
                icon={Icon.Sidebar}
                target={<PromptDetail client={client} prompt={prompt} />}
              />
              {prompt.content ? <Action.CopyToClipboard title="Copy Prompt" content={prompt.content} /> : null}
              {prompt.url ? <Action.OpenInBrowser title="Open Prompt in Browser" url={prompt.url} /> : null}
              <Action
                title="Reload Prompts"
                icon={Icon.ArrowClockwise}
                onAction={() => setRevision((value) => value + 1)}
              />
              <Action.OpenInBrowser title="Open Tinkerer Club" url={client.baseUrl} icon={Icon.Globe} />
            </ActionPanel>
          }
        />
      ))}
      {!isLoading && prompts.length === 0 ? (
        <List.EmptyView
          title={failure ? "Could Not Load Prompts" : "No Prompts Found"}
          description={failure ?? "Try a different search or library view."}
          icon={failure ? Icon.Warning : Icon.MagnifyingGlass}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={() => setRevision((value) => value + 1)} />
              <Action.OpenInBrowser title="Open API Docs" url={client.docsUrl} />
            </ActionPanel>
          }
        />
      ) : null}
    </List>
  );
}
