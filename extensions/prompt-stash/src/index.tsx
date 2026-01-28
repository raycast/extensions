import { ActionPanel, List, Action, Icon, Keyboard } from "@raycast/api";
import CreatePromptForm from "./components/CreatePromptForm";
import EditPromptForm from "./components/EditPromptForm";
import PromptDetail from "./components/PromptDetail";
import { useLocalPrompts, usePrompt } from "./hooks";
import { TAGS } from "./config";
import { useCallback, useState } from "react";

export default function Command() {
  const [prompts, isLoading, loadPrompts] = useLocalPrompts();
  const [selectedTag, setSelectedTag] = useState("all");
  const [, destroy] = usePrompt();

  const filteredPrompts = useCallback(() => {
    return prompts?.filter((prompt) => {
      if (selectedTag === "all") return true;
      if (selectedTag === "favorite") return prompt.isFavorite;
      return prompt.tags.includes(selectedTag);
    });
  }, [prompts, selectedTag]);

  return (
    <List
      isShowingDetail
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by tag" onChange={setSelectedTag}>
          <List.Dropdown.Item title="All" value="all" />
          <List.Dropdown.Item title="Favorite" value="favorite" icon={Icon.StarCircle} />
          {TAGS.map((tag) => (
            <List.Dropdown.Item key={tag.value} title={tag.title} value={tag.value} icon={tag.icon} />
          ))}
        </List.Dropdown>
      }
      isLoading={isLoading}
      searchBarPlaceholder="Search prompts..."
    >
      <List.EmptyView
        title="No prompts"
        description="Create your first prompt"
        actions={
          <ActionPanel>
            <Action.Push icon={Icon.Plus} onPop={loadPrompts} title="Create Prompt" target={<CreatePromptForm />} />
          </ActionPanel>
        }
      />
      {filteredPrompts()?.map((prompt) => (
        <List.Item
          key={prompt.id}
          id={prompt.id}
          keywords={prompt.tags}
          title={prompt.title}
          icon={prompt.isFavorite ? Icon.Star : undefined}
          detail={<List.Item.Detail markdown={prompt.content} />}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard icon={Icon.Clipboard} title="Copy Prompt" content={prompt.content} />
              <Action.Push
                icon={Icon.Plus}
                onPush={loadPrompts}
                onPop={loadPrompts}
                title="Create Prompt"
                target={<CreatePromptForm />}
              />
              <Action.Push
                icon={Icon.Eye}
                onPop={loadPrompts}
                title="View Prompt"
                target={<PromptDetail prompt={prompt} />}
              />
              <Action.Push
                icon={Icon.Pencil}
                onPop={loadPrompts}
                title="Edit Prompt"
                shortcut={{ modifiers: ["cmd"], key: "e" }}
                target={<EditPromptForm promptId={prompt.id} />}
              />
              <Action
                icon={Icon.Trash}
                title="Delete Prompt"
                shortcut={Keyboard.Shortcut.Common.Remove}
                style={Action.Style.Destructive}
                onAction={async () => await destroy(prompt.id, async () => await loadPrompts())}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
