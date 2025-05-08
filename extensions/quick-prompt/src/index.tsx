import { useState, useMemo } from "react";
import { nanoid } from "nanoid";
import { ActionPanel, Icon, List, Action } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { Prompt, PromptFormValues } from "./types";
import { CreatePromptAction, EmptyView } from "./components";

type State = {
  searchText: string;
};

export default function Command() {
  const [state, setState] = useState<State>({
    searchText: "",
  });
  const { value: prompts, setValue: setPrompts, isLoading } = useLocalStorage<Prompt[]>("prompts");

  const handleCreate = (values: PromptFormValues) => {
    setPrompts([
      {
        id: nanoid(),
        title: values.title,
        content: values.content,
        tags: values.tags.split(",").filter((tag) => tag.trim() !== ""),
        enabled: values.enabled,
      },
      ...(prompts ?? []),
    ]);
    setState((previous) => ({
      ...previous,
      searchText: "",
    }));
  };

  // 只展示启用的 prompt
  const enabledPrompts = useMemo(() => prompts?.filter((prompt) => prompt.enabled) ?? [], [prompts]);

  // 自定义过滤逻辑，匹配 title、content 和 tags
  const filteredPrompts = useMemo(() => {
    if (!state.searchText) return enabledPrompts;

    const searchText = state.searchText.toLowerCase();
    return enabledPrompts.filter((prompt) => {
      const titleMatch = prompt.title.toLowerCase().includes(searchText);
      const contentMatch = prompt.content.toLowerCase().includes(searchText);
      const tagsMatch = prompt.tags ? prompt.tags.some((tag) => tag.toLowerCase().includes(searchText)) : false;

      return titleMatch || contentMatch || tagsMatch;
    });
  }, [enabledPrompts, state.searchText]);

  return (
    <List
      isLoading={isLoading}
      searchText={state.searchText}
      searchBarPlaceholder="Search prompts"
      onSearchTextChange={(newValue) => {
        setState((previous) => ({ ...previous, searchText: newValue }));
      }}
      isShowingDetail={filteredPrompts.length > 0}
    >
      <EmptyView prompts={filteredPrompts} searchText={state.searchText} onCreate={handleCreate} />
      {filteredPrompts.map((prompt) => (
        <List.Item
          key={prompt.id}
          icon={Icon.Snippets}
          title={prompt.title}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.Paste content={prompt.content} title="Paste Prompt" />
                <Action.CopyToClipboard content={prompt.content} />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <CreatePromptAction defaultTitle={state.searchText} onCreate={handleCreate} />
              </ActionPanel.Section>
            </ActionPanel>
          }
          detail={
            <List.Item.Detail
              markdown={prompt.content}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="title" text={prompt.title} />
                  {prompt.tags && prompt.tags.length > 0 && (
                    <List.Item.Detail.Metadata.Label title="tags" text={prompt.tags.join(", ")} />
                  )}
                </List.Item.Detail.Metadata>
              }
            />
          }
        />
      ))}
    </List>
  );
}
