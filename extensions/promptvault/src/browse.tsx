import React, { useState, useEffect, useMemo } from "react";
import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Clipboard,
  Icon,
  Detail,
  useNavigation,
  showHUD,
  openExtensionPreferences,
  Color,
} from "@raycast/api";
import {
  fetchPrompts,
  fetchCategories,
  getPromptDetail,
  searchPrompts,
  filterByCategory,
  getAllTags,
  getPreferences,
} from "./api";
import { extractVariables, formatTags } from "./utils/variables";
import { VariableForm } from "./components/VariableForm";
import { AiFillForm } from "./components/AiFillForm";
import type { PromptListItem, PromptDetail, Category } from "./types";

type SortOption = "recent" | "alphabetical" | "oldest";

export default function Command() {
  const [prompts, setPrompts] = useState<PromptListItem[]>([]);
  const [filteredPrompts, setFilteredPrompts] = useState<PromptListItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedTag, setSelectedTag] = useState<string>("");
  const [showArchived, setShowArchived] = useState(false);
  const [showForksOnly, setShowForksOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("recent");

  const { push } = useNavigation();
  const { apiUrl } = getPreferences();

  // Get all unique tags from prompts
  const availableTags = useMemo(() => getAllTags(prompts), [prompts]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    let filtered = prompts;

    // Filter archived
    if (!showArchived) {
      filtered = filtered.filter((p) => !p.isArchived);
    }

    // Filter forks only
    if (showForksOnly) {
      filtered = filtered.filter(
        (p) => (p as PromptListItem & { forkedFromId?: string }).forkedFromId,
      );
    }

    // Apply category filter
    if (selectedCategory) {
      filtered = filterByCategory(filtered, selectedCategory);
    }

    // Apply tag filter
    if (selectedTag) {
      filtered = filtered.filter((p) =>
        p.tags?.some((t) => t.slug === selectedTag),
      );
    }

    // Apply search filter
    if (searchText) {
      filtered = searchPrompts(filtered, searchText);
    }

    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "alphabetical":
          return a.name.localeCompare(b.name);
        case "oldest":
          return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        case "recent":
        default:
          return (
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
      }
    });

    setFilteredPrompts(filtered);
  }, [
    prompts,
    searchText,
    selectedCategory,
    selectedTag,
    showArchived,
    showForksOnly,
    sortBy,
  ]);

  const loadData = async () => {
    try {
      setIsLoading(true);

      const [fetchedPrompts, fetchedCategories] = await Promise.all([
        fetchPrompts(),
        fetchCategories(),
      ]);

      setPrompts(fetchedPrompts);
      setCategories(fetchedCategories);

      if (fetchedPrompts.length === 0) {
        await showToast({
          style: Toast.Style.Success,
          title: "No Prompts",
          message: "Create your first prompt in PromptVault",
        });
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error Loading Data",
        message: error instanceof Error ? error.message : "Failed to load data",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePromptSelect = async (prompt: PromptListItem) => {
    try {
      const detail = await getPromptDetail(prompt.slug);
      const content = detail.version?.content || "";
      const variables = extractVariables(content);

      if (variables.length > 0) {
        push(<VariableForm prompt={detail} variables={variables} />);
      } else {
        await copyPrompt(detail);
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message:
          error instanceof Error ? error.message : "Failed to load prompt",
      });
    }
  };

  const copyPrompt = async (prompt: PromptDetail) => {
    const content = prompt.version?.content || "";
    await Clipboard.copy(content);
    await showHUD(`Copied "${prompt.name}" to clipboard`);
  };

  const showPromptDetail = async (prompt: PromptListItem) => {
    try {
      const detail = await getPromptDetail(prompt.slug);
      const content = detail.version?.content || "";
      const variables = extractVariables(content);
      const tags = formatTags(detail.tags);

      const markdown = `
# ${detail.name}

${detail.description ? `**Description:** ${detail.description}\n` : ""}
${detail.category ? `**Category:** ${detail.category.name}\n` : ""}
${tags ? `**Tags:** ${tags}\n` : ""}
${variables.length > 0 ? `**Variables:** ${variables.join(", ")}\n` : ""}
**Version:** ${detail.version?.number || "N/A"}

---

## Content

\`\`\`
${content}
\`\`\`
      `;

      push(
        <Detail
          markdown={markdown}
          actions={
            <ActionPanel>
              <Action
                title="Fill & Copy"
                onAction={() => handlePromptSelect(prompt)}
                icon={Icon.Pencil}
              />
              <Action
                title="Copy Raw"
                onAction={() => copyPrompt(detail)}
                icon={Icon.Clipboard}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action.OpenInBrowser
                title="Open in Browser"
                url={`${apiUrl}/prompts/${prompt.slug}`}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
            </ActionPanel>
          }
        />,
      );
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message:
          error instanceof Error ? error.message : "Failed to load details",
      });
    }
  };

  const getSubtitle = (prompt: PromptListItem): string => {
    const parts: string[] = [];
    if (prompt.category) {
      parts.push(prompt.category.name);
    }
    return parts.join(" • ");
  };

  const getAccessories = (prompt: PromptListItem): List.Item.Accessory[] => {
    const accessories: List.Item.Accessory[] = [];

    // Show archived badge
    if (prompt.isArchived) {
      accessories.push({
        icon: { source: Icon.Tray, tintColor: Color.SecondaryText },
        tooltip: "Archived",
      });
    }

    // Show fork badge
    if ((prompt as PromptListItem & { forkedFromId?: string }).forkedFromId) {
      accessories.push({
        icon: { source: Icon.Link, tintColor: Color.Purple },
        tooltip: "Fork",
      });
    }

    // Show tags
    if (prompt.tags && prompt.tags.length > 0) {
      accessories.push({
        text: prompt.tags
          .slice(0, 2)
          .map((t) => `#${t.name}`)
          .join(" "),
      });
    }

    return accessories;
  };

  const getSortLabel = (sort: SortOption): string => {
    switch (sort) {
      case "alphabetical":
        return "A-Z";
      case "oldest":
        return "Plus ancien";
      case "recent":
      default:
        return "Plus récent";
    }
  };

  // Build filter status for navigation title
  const getFilterStatus = (): string => {
    const parts: string[] = [];
    if (selectedTag) {
      const tag = availableTags.find((t) => t.slug === selectedTag);
      parts.push(`#${tag?.name || selectedTag}`);
    }
    if (showArchived) parts.push("Archives");
    if (showForksOnly) parts.push("Forks");
    if (sortBy !== "recent") parts.push(getSortLabel(sortBy));
    return parts.length > 0 ? ` (${parts.join(", ")})` : "";
  };

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search prompts..."
      navigationTitle={`Browse Prompts${getFilterStatus()}`}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Category"
          onChange={setSelectedCategory}
        >
          <List.Dropdown.Item title="All Categories" value="" />
          {categories.map((category) => (
            <List.Dropdown.Item
              key={category.id}
              title={category.name}
              value={category.id}
              icon={category.icon}
            />
          ))}
        </List.Dropdown>
      }
    >
      {filteredPrompts.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No Prompts Found"
          description={
            searchText ||
            selectedCategory ||
            selectedTag ||
            showArchived ||
            showForksOnly
              ? "Try adjusting your filters"
              : "Create your first prompt in PromptVault"
          }
          actions={
            <ActionPanel>
              <Action
                title="Clear Filters"
                onAction={() => {
                  setSelectedCategory("");
                  setSelectedTag("");
                  setShowArchived(false);
                  setShowForksOnly(false);
                  setSortBy("recent");
                }}
                icon={Icon.XMarkCircle}
              />
              <Action
                title="Refresh"
                onAction={loadData}
                icon={Icon.ArrowClockwise}
              />
              <Action
                title="Open Preferences"
                onAction={openExtensionPreferences}
                icon={Icon.Gear}
              />
            </ActionPanel>
          }
        />
      ) : (
        filteredPrompts.map((prompt) => (
          <List.Item
            key={prompt.id}
            title={prompt.name}
            subtitle={getSubtitle(prompt)}
            accessories={getAccessories(prompt)}
            icon={prompt.category?.icon || Icon.Document}
            actions={
              <ActionPanel>
                {/* Main actions */}
                <ActionPanel.Section>
                  <Action
                    title="Fill & Copy"
                    onAction={() => handlePromptSelect(prompt)}
                    icon={Icon.Pencil}
                  />
                  <Action
                    title="AI Fill"
                    onAction={async () => {
                      const detail = await getPromptDetail(prompt.slug);
                      const content = detail.version?.content || "";
                      const vars = extractVariables(content);
                      if (vars.length > 0) {
                        push(<AiFillForm prompt={detail} variables={vars} />);
                      } else {
                        await showToast({
                          style: Toast.Style.Failure,
                          title: "Pas de variables",
                          message: "Ce prompt ne contient pas de variables",
                        });
                      }
                    }}
                    icon={Icon.Wand}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                  />
                  <Action
                    title="View Details"
                    onAction={() => showPromptDetail(prompt)}
                    icon={Icon.Eye}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                  />
                  <Action
                    title="Copy Raw"
                    onAction={async () => {
                      const detail = await getPromptDetail(prompt.slug);
                      await copyPrompt(detail);
                    }}
                    icon={Icon.Clipboard}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action.OpenInBrowser
                    title="Open in Browser"
                    url={`${apiUrl}/prompts/${prompt.slug}`}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                  />
                </ActionPanel.Section>

                {/* Filter by Tag submenu */}
                <ActionPanel.Section title="Filters">
                  <ActionPanel.Submenu
                    title={
                      selectedTag
                        ? `Tag: #${availableTags.find((t) => t.slug === selectedTag)?.name}`
                        : "Filter by Tag"
                    }
                    icon={Icon.Tag}
                    shortcut={{ modifiers: ["cmd"], key: "t" }}
                  >
                    <Action
                      title="All Tags"
                      onAction={() => setSelectedTag("")}
                      icon={selectedTag === "" ? Icon.Checkmark : Icon.Circle}
                    />
                    {availableTags.map((tag) => (
                      <Action
                        key={tag.slug}
                        title={`#${tag.name}`}
                        onAction={() => setSelectedTag(tag.slug)}
                        icon={
                          selectedTag === tag.slug
                            ? Icon.Checkmark
                            : Icon.Circle
                        }
                      />
                    ))}
                  </ActionPanel.Submenu>

                  <Action
                    title={showArchived ? "Hide Archived" : "Show Archived"}
                    onAction={() => setShowArchived(!showArchived)}
                    icon={showArchived ? Icon.EyeDisabled : Icon.Tray}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                  />

                  <Action
                    title={showForksOnly ? "Show All" : "Show Forks Only"}
                    onAction={() => setShowForksOnly(!showForksOnly)}
                    icon={Icon.Link}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                  />
                </ActionPanel.Section>

                {/* Sort submenu */}
                <ActionPanel.Section title="Sort">
                  <ActionPanel.Submenu
                    title={`Sort: ${getSortLabel(sortBy)}`}
                    icon={Icon.List}
                    shortcut={{ modifiers: ["cmd"], key: "s" }}
                  >
                    <Action
                      title="Plus récent"
                      onAction={() => setSortBy("recent")}
                      icon={sortBy === "recent" ? Icon.Checkmark : Icon.Circle}
                    />
                    <Action
                      title="Plus ancien"
                      onAction={() => setSortBy("oldest")}
                      icon={sortBy === "oldest" ? Icon.Checkmark : Icon.Circle}
                    />
                    <Action
                      title="Alphabétique (A-Z)"
                      onAction={() => setSortBy("alphabetical")}
                      icon={
                        sortBy === "alphabetical" ? Icon.Checkmark : Icon.Circle
                      }
                    />
                  </ActionPanel.Submenu>
                </ActionPanel.Section>

                {/* Other actions */}
                <ActionPanel.Section>
                  <Action
                    title="Clear All Filters"
                    onAction={() => {
                      setSelectedCategory("");
                      setSelectedTag("");
                      setShowArchived(false);
                      setShowForksOnly(false);
                      setSortBy("recent");
                    }}
                    icon={Icon.XMarkCircle}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
                  />
                  <Action
                    title="Refresh"
                    onAction={loadData}
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
