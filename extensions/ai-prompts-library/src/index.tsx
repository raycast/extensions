import { useState, useEffect, useMemo } from "react";
import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Icon,
  Color,
  Clipboard,
  Detail,
} from "@raycast/api";
import { loadPrompts } from "./utils/loadPrompts";
import { Prompt, Category, CATEGORY_LABELS, CATEGORY_ICONS } from "./types";

export default function SearchPrompts() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<Category>(Category.All);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const loadedPrompts = loadPrompts();
        setPrompts(loadedPrompts);
        setIsLoading(false);

        if (loadedPrompts.length === 0) {
          await showToast({
            style: Toast.Style.Failure,
            title: "No prompts found",
            message: "Please check your prompt_library.csv file",
          });
        }
      } catch (error) {
        setIsLoading(false);
        await showToast({
          style: Toast.Style.Failure,
          title: "Error loading prompts",
          message: String(error),
        });
      }
    }

    loadData();
  }, []);

  const filteredPrompts = useMemo(() => {
    let filtered = prompts;

    // Filter by category
    if (selectedCategory !== Category.All) {
      filtered = filtered.filter((prompt) => prompt.category === selectedCategory);
    }

    // Filter by search text
    if (searchText) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter(
        (prompt) =>
          prompt.name.toLowerCase().includes(search) || prompt.prompt.toLowerCase().includes(search)
      );
    }

    return filtered;
  }, [prompts, selectedCategory, searchText]);

  // Group prompts by category
  const groupedPrompts = useMemo(() => {
    const groups: Record<string, Prompt[]> = {};

    filteredPrompts.forEach((prompt) => {
      const category = prompt.category;
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(prompt);
    });

    return groups;
  }, [filteredPrompts]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search prompts by name or content..."
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Category"
          value={selectedCategory}
          onChange={(newValue: string) => setSelectedCategory(newValue as Category)}
        >
          {Object.values(Category).map((category) => (
            <List.Dropdown.Item
              key={category}
              title={CATEGORY_LABELS[category]}
              value={category}
              icon={CATEGORY_ICONS[category]}
            />
          ))}
        </List.Dropdown>
      }
    >
      {Object.entries(groupedPrompts).map(([category, categoryPrompts]) => (
        <List.Section
          key={category}
          title={CATEGORY_LABELS[category as Category]}
          subtitle={`${categoryPrompts.length} prompts`}
        >
          {categoryPrompts.map((prompt) => (
            <PromptListItem key={prompt.id} prompt={prompt} />
          ))}
        </List.Section>
      ))}

      {!isLoading && filteredPrompts.length === 0 && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No prompts found"
          description="Try adjusting your search or category filter"
        />
      )}
    </List>
  );
}

function PromptListItem({ prompt }: { prompt: Prompt }) {
  const subtitle = prompt.prompt.length > 100 ? prompt.prompt.slice(0, 100) + "..." : prompt.prompt;

  async function handlePaste() {
    try {
      await Clipboard.paste(prompt.prompt);
      await showToast({
        style: Toast.Style.Success,
        title: "Pasted to active app",
        message: prompt.name,
      });
    } catch (error) {
      // Fallback to copy if paste fails
      await Clipboard.copy(prompt.prompt);
      await showToast({
        style: Toast.Style.Success,
        title: "Copied to clipboard",
        message: "Could not paste to active app, copied instead",
      });
    }
  }

  async function handleCopy() {
    await Clipboard.copy(prompt.prompt);
    await showToast({
      style: Toast.Style.Success,
      title: "Copied to clipboard",
      message: prompt.name,
    });
  }

  return (
    <List.Item
      title={prompt.name}
      subtitle={subtitle}
      icon={{
        source: Icon.Document,
        tintColor: getCategoryColor(prompt.category),
      }}
      accessories={[
        {
          tag: {
            value: CATEGORY_LABELS[prompt.category],
            color: getCategoryColor(prompt.category),
          },
        },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Actions">
            <Action title="Paste to Active App" icon={Icon.Clipboard} onAction={handlePaste} />
            <Action title="Copy to Clipboard" icon={Icon.CopyClipboard} onAction={handleCopy} />
          </ActionPanel.Section>
          <ActionPanel.Section title="View">
            <Action.Push
              title="View Full Prompt"
              icon={Icon.Eye}
              target={<PromptDetail prompt={prompt} />}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function PromptDetail({ prompt }: { prompt: Prompt }) {
  async function handlePaste() {
    try {
      await Clipboard.paste(prompt.prompt);
      await showToast({
        style: Toast.Style.Success,
        title: "Pasted to active app",
      });
    } catch (error) {
      await Clipboard.copy(prompt.prompt);
      await showToast({
        style: Toast.Style.Success,
        title: "Copied to clipboard",
        message: "Could not paste to active app",
      });
    }
  }

  return (
    <Detail
      markdown={`# ${prompt.name}\n\n**Category:** ${CATEGORY_LABELS[prompt.category]}\n\n**Characters:** ${prompt.prompt.length}\n\n---\n\n${prompt.prompt}`}
      actions={
        <ActionPanel>
          <Action title="Paste to Active App" icon={Icon.Clipboard} onAction={handlePaste} />
          <Action.CopyToClipboard content={prompt.prompt} title="Copy Prompt" />
        </ActionPanel>
      }
    />
  );
}

function getCategoryColor(category: Category): Color {
  const colors: Record<Category, Color> = {
    [Category.All]: Color.Blue,
    [Category.Development]: Color.Purple,
    [Category.Marketing]: Color.Green,
    [Category.Writing]: Color.Orange,
    [Category.Research]: Color.Blue,
    [Category.Design]: Color.Magenta,
    [Category.Business]: Color.Red,
    [Category.General]: Color.SecondaryText,
  };

  return colors[category] || Color.SecondaryText;
}
