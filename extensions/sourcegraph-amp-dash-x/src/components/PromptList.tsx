// @ts-nocheck: Raycast API has fundamental React type compatibility issues
import {
  Action,
  ActionPanel,
  List,
  Toast,
  showToast,
  Icon,
} from "@raycast/api";
import React, { useState, useEffect } from "react";
import {
  getPrompts,
  deletePrompt,
  Prompt,
  initializeDefaults,
} from "../lib/storage";
import PromptForm from "./PromptForm";

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
      showToast(Toast.Style.Failure, "Failed to delete prompt");
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
      showToast(Toast.Style.Failure, "Failed to duplicate prompt");
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
          // @ts-expect-error: Raycast JSX components have Element/ReactNode type compatibility issues
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
      // @ts-expect-error: Raycast JSX components have Element/ReactNode type compatibility issues
      <Action.Push
        key="edit"
        title="Edit"
        icon={Icon.Pencil}
        target={<PromptForm prompt={prompt} onSave={loadPrompts} />}
      />,
      // @ts-expect-error: Raycast JSX components have Element/ReactNode type compatibility issues
      <Action
        key="duplicate"
        title="Duplicate"
        icon={Icon.Duplicate}
        onAction={() => handleDuplicate(prompt)}
      />,
      // @ts-expect-error: Raycast JSX components have Element/ReactNode type compatibility issues
      <ActionPanel.Section key="danger">
        {/* @ts-expect-error: Raycast JSX components have Element/ReactNode type compatibility issues */}
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
    // @ts-expect-error: Raycast JSX components have Element/ReactNode type compatibility issues
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={searchPlaceholder}
    >
      {/* @ts-expect-error: Raycast JSX components have Element/ReactNode type compatibility issues */}
      {Object.entries(groupedPrompts).map(([category, categoryPrompts]) => (
        // @ts-expect-error: Raycast JSX components have Element/ReactNode type compatibility issues
        <List.Section key={category} title={category}>
          {/* @ts-expect-error: Raycast JSX components have Element/ReactNode type compatibility issues */}
          {categoryPrompts.map((prompt) => {
            return (
              // @ts-expect-error: Raycast JSX components have Element/ReactNode type compatibility issues
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
                actions={
                  // @ts-expect-error: Raycast JSX components have Element/ReactNode type compatibility issues
                  <ActionPanel>
                    {/* @ts-expect-error: Raycast JSX components have Element/ReactNode type compatibility issues */}
                    {getPromptActions(prompt)}
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
      {filteredPrompts.length === 0 && !isLoading && (
        // @ts-expect-error: Raycast JSX components have Element/ReactNode type compatibility issues
        <List.EmptyView
          title={emptyTitle}
          description={emptyDescription}
          icon={Icon.Document}
        />
      )}
    </List>
  );
}
