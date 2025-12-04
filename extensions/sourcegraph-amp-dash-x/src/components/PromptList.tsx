import {
  Action,
  ActionPanel,
  List,
  Toast,
  showToast,
  Icon,
} from "@raycast/api";
import { useState, useEffect } from "react";
import {
  getPrompts,
  deletePrompt,
  Prompt,
  initializeDefaults,
} from "../lib/storage";
import PromptForm from "./PromptForm";
import { showFailureToast } from "@raycast/utils";

interface PromptListProps {
  onSelect?: (prompt: Prompt) => void;
  showManageActions?: boolean;
  searchPlaceholder?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}

export default function PromptList({
  onSelect,
  showManageActions = false,
  searchPlaceholder = "Search prompts...",
  emptyTitle = "No prompts found",
  emptyDescription = "Add a new prompt or adjust your search",
}: PromptListProps) {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    initializeDefaults().then(() => loadPrompts());
  }, []);

  async function loadPrompts() {
    setIsLoading(true);
    try {
      const stored = await getPrompts();
      setPrompts(
        stored.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()),
      );
    } catch (error) {
      showFailureToast(error, { title: "Failed to load prompts" });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deletePrompt(id);
      setPrompts((prev) => prev.filter((p) => p.id !== id));
      showToast(Toast.Style.Success, "Prompt deleted");
    } catch (error) {
      showFailureToast(error, { title: "Failed to delete prompt" });
    }
  }

  async function handleDuplicate(prompt: Prompt) {
    try {
      const { savePrompt } = await import("../lib/storage");
      await savePrompt({
        title: `${prompt.title} (Copy)`,
        prompt: prompt.prompt,
        category: prompt.category,
        ...(prompt.description ? { description: prompt.description } : {}),
      });
      await loadPrompts();
      showToast(Toast.Style.Success, "Prompt duplicated");
    } catch (error) {
      showFailureToast(error, { title: "Failed to duplicate prompt" });
    }
  }

  const filteredPrompts = prompts.filter(
    (prompt) =>
      prompt.title.toLowerCase().includes(searchText.toLowerCase()) ||
      prompt.category.toLowerCase().includes(searchText.toLowerCase()) ||
      prompt.description?.toLowerCase().includes(searchText.toLowerCase()),
  );

  const groupedPrompts = filteredPrompts.reduce(
    (groups, prompt) => {
      const category = prompt.category || "Uncategorized";
      if (!groups[category]) groups[category] = [];
      groups[category].push(prompt);
      return groups;
    },
    {} as Record<string, Prompt[]>,
  );

  function getPromptActions(prompt: Prompt) {
    const baseActions = onSelect
      ? [
          <Action
            key="select"
            title="Select"
            onAction={() => onSelect(prompt)}
          />,
        ]
      : [];

    if (!showManageActions) {
      return baseActions;
    }

    return [
      ...baseActions,

      <Action.Push
        key="edit"
        title="Edit"
        icon={Icon.Pencil}
        target={<PromptForm prompt={prompt} onSave={loadPrompts} />}
      />,

      <Action
        key="duplicate"
        title="Duplicate"
        icon={Icon.Duplicate}
        onAction={() => handleDuplicate(prompt)}
      />,

      <ActionPanel.Section key="danger">
        <Action
          title="Delete"
          style={Action.Style.Destructive}
          icon={Icon.Trash}
          onAction={() => handleDelete(prompt.id)}
        />
      </ActionPanel.Section>,
    ];
  }

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={searchPlaceholder}
    >
      {Object.entries(groupedPrompts).map(([category, categoryPrompts]) => (
        <List.Section key={category} title={category}>
          {categoryPrompts.map((prompt) => {
            return (
              <List.Item
                key={prompt.id}
                title={prompt.title}
                {...(prompt.description
                  ? { subtitle: prompt.description }
                  : {})}
                accessories={[
                  {
                    date: prompt.updatedAt,
                    tooltip: `Last updated: ${prompt.updatedAt.toLocaleString()}`,
                  },
                ]}
                actions={<ActionPanel>{getPromptActions(prompt)}</ActionPanel>}
              />
            );
          })}
        </List.Section>
      ))}
      {filteredPrompts.length === 0 && !isLoading && (
        <List.EmptyView
          title={emptyTitle}
          description={emptyDescription}
          icon={Icon.Document}
        />
      )}
    </List>
  );
}
