import React, { useState, useMemo, useEffect } from "react";
import { List, Action, ActionPanel, Icon } from "@raycast/api";
import { Command, CategoryType, Section, ThinkingKeyword } from "../types";
import { cheatsheetData } from "../data";
import { CATEGORIES, SECTION_ORDER, BUDGET_DISPLAY } from "../utils/constants";
import { useCopyToClipboard } from "../hooks/useCopyToClipboard";
import { CommandDetail } from "./CommandDetail";
import { getBadgeProps } from "./Badge";
import { isCommand } from "../utils";

const categoryList = SECTION_ORDER.map(id => ({
  id,
  title: CATEGORIES[id],
  // Placeholder for adding icons in the future
  // icon: getIconForCategory(id)
}));

export function CommandList() {
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>("all");
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { copyToClipboard } = useCopyToClipboard();

  // Handle loading state for search/filter operations
  useEffect(() => {
    if (searchText || selectedCategory !== "all") {
      setIsLoading(true);
      const timer = setTimeout(() => setIsLoading(false), 100);
      return () => clearTimeout(timer);
    }
  }, [searchText, selectedCategory]);

  const filteredSections = useMemo(() => {
    let sections: Section[] = cheatsheetData.sections;

    // 1. Filter by category
    if (selectedCategory !== "all") {
      sections = sections.filter(s => s.id === selectedCategory);
    }

    // 2. Return early if no search text
    if (!searchText) {
      return sections;
    }

    // 3. Filter by search text
    const searchLower = searchText.toLowerCase();

    return sections
      .map(section => {
        const filteredCommands = (section.commands || []).filter(
          command =>
            command.name.toLowerCase().includes(searchLower) ||
            command.description.toLowerCase().includes(searchLower) ||
            (command.tags && command.tags.some(tag => tag.toLowerCase().includes(searchLower)))
        );

        const filteredThinkingKeywords = (section.thinkingKeywords || []).filter(
          keyword =>
            keyword.keyword.toLowerCase().includes(searchLower) ||
            keyword.description.toLowerCase().includes(searchLower) ||
            keyword.budget.toLowerCase().includes(searchLower)
        );

        return {
          ...section,
          commands: filteredCommands,
          thinkingKeywords: filteredThinkingKeywords,
        };
      })
      .filter(
        section =>
          (section.commands && section.commands.length > 0) ||
          (section.thinkingKeywords && section.thinkingKeywords.length > 0)
      );
  }, [selectedCategory, searchText]);

  const createAccessories = (item: Command | ThinkingKeyword): List.Item.Accessory[] => {
    const accessories: List.Item.Accessory[] = [];

    let badge;
    if (isCommand(item)) {
      // Command type
      const hasWarning = item.warning === true;
      const isDeprecated = item.deprecated === true;
      const badgeType = isDeprecated ? "deprecated" : hasWarning ? "warning" : undefined;
      if (badgeType) {
        badge = getBadgeProps({ type: badgeType });
      }
    } else {
      // ThinkingKeyword type
      const keyword = item as ThinkingKeyword;
      badge = getBadgeProps({
        type: "budget",
        budget: keyword.budget,
        tokens: keyword.tokens,
      });
    }

    if (badge) {
      accessories.push({
        text: badge.text,
        ...(badge.icon && { icon: badge.icon as string }),
        ...(badge.color && { color: badge.color }),
      });
    }

    return accessories;
  };

  const getBudgetDisplay = (budget: string) => {
    return BUDGET_DISPLAY[budget as keyof typeof BUDGET_DISPLAY] || { emoji: "", label: "", description: "" };
  };

  const generateMarkdown = (item: Command | ThinkingKeyword) => {
    const command: Command = isCommand(item)
      ? (item as Command)
      : {
          id: `thinking-${(item as ThinkingKeyword).keyword.replace(/\s+/g, "-")}`,
          name: (item as ThinkingKeyword).keyword,
          description: (item as ThinkingKeyword).description,
          usage: "Add to end of prompt",
          example: (item as ThinkingKeyword).example || `Your prompt here ${(item as ThinkingKeyword).keyword}`,
          category: "thinking",
          tags: [`${(item as ThinkingKeyword).budget} budget`, `${(item as ThinkingKeyword).tokens} tokens`],
        };
    const thinkingKeyword = isCommand(item) ? undefined : (item as ThinkingKeyword);
    const isThinkingCategory = command.category === "thinking";

    const sections = [];

    // Title
    sections.push(`# ${command.name}`);

    // Description
    if (command.description) {
      sections.push(`## Description\n${command.description}`);
    }

    // Usage (not for thinking category)
    if (command.usage && !isThinkingCategory) {
      sections.push(`## Usage\n\`\`\`\n${command.usage}\n\`\`\``);
    }

    // Example
    if (command.example && command.example !== command.usage) {
      sections.push(`## Example\n\`\`\`\n${command.example}\n\`\`\``);
    }

    // Thinking Keyword Details
    if (isThinkingCategory && thinkingKeyword) {
      const budgetDisplay = getBudgetDisplay(thinkingKeyword.budget);
      const thinkingDetails = [
        `## Thinking Keyword Details`,
        `- **Budget**: ${budgetDisplay.emoji} ${budgetDisplay.label} (${budgetDisplay.description})`,
        `- **Tokens**: ${thinkingKeyword.tokens}`,
        thinkingKeyword.description ? `- **Description**: ${thinkingKeyword.description}` : null,
      ]
        .filter(Boolean)
        .join("\n");
      sections.push(thinkingDetails);
    }

    // Deprecated
    if (command.deprecated) {
      const alternativeText = command.alternative
        ? `**Alternative**: \`${command.alternative}\``
        : `This command is deprecated and should not be used.`;
      sections.push(`## ⚠️ Deprecated\n${alternativeText}`);
    }

    // Warning
    if (command.warning) {
      sections.push(`## ⚠️ Warning\nUse this command with caution.`);
    }

    // Tags
    if (command.tags && command.tags.length > 0) {
      sections.push(`## Tags\n${command.tags.map(tag => `- ${tag}`).join("\n")}`);
    }

    return sections.join("\n\n");
  };

  const renderItem = (item: Command | ThinkingKeyword) => {
    const accessories = createAccessories(item);
    const MAX_COMBINED_LENGTH = 70;

    if (isCommand(item)) {
      const displayTitle = item.deprecated ? `[DEPRECATED] ${item.name}` : item.name;
      let displaySubtitle = item.deprecated
        ? `${item.description} ${item.alternative ? `(Use: ${item.alternative})` : ""}`
        : item.description;

      const availableForSubtitle = MAX_COMBINED_LENGTH - displayTitle.length;
      if (displaySubtitle.length > availableForSubtitle) {
        if (availableForSubtitle > 3) {
          displaySubtitle = displaySubtitle.substring(0, availableForSubtitle - 3) + "...";
        } else if (availableForSubtitle > 0) {
          displaySubtitle = "...";
        } else {
          displaySubtitle = "";
        }
      }

      return (
        <List.Item
          key={item.id}
          title={displayTitle}
          subtitle={displaySubtitle}
          accessories={accessories}
          actions={
            <ActionPanel>
              <Action
                title="Copy to Clipboard"
                icon={Icon.Clipboard}
                onAction={() => copyToClipboard(item.usage, `Copied "${item.name}" to clipboard.`)}
              />
              <Action.Push title="Show Details" icon={Icon.Eye} target={<CommandDetail command={item} />} />
              {item.example && item.example !== item.usage && (
                <Action
                  title="Copy Example"
                  icon={Icon.Document}
                  onAction={() => copyToClipboard(item.example!, `Example: ${item.example} copied to clipboard`)}
                />
              )}
              {item.deprecated && item.alternative && (
                <Action
                  title="Copy Alternative Command"
                  icon={Icon.ArrowRight}
                  onAction={() =>
                    copyToClipboard(item.alternative!, `Alternative: ${item.alternative} copied to clipboard`)
                  }
                />
              )}
            </ActionPanel>
          }
          detail={<List.Item.Detail markdown={generateMarkdown(item)} />}
        />
      );
    } else {
      // ThinkingKeyword
      const keyword = item;
      const commandForDetail: Command = {
        id: `thinking-${keyword.keyword.replace(/\s+/g, "-")}`,
        name: keyword.keyword,
        description: keyword.description,
        usage: "Add to end of prompt",
        example: keyword.example || `Your prompt here ${keyword.keyword}`,
        category: "thinking",
        tags: [`${keyword.budget} budget`, `${keyword.tokens} tokens`],
      };

      const displayTitle = keyword.keyword;
      let displaySubtitle = keyword.description;

      const availableForSubtitle = MAX_COMBINED_LENGTH - displayTitle.length;
      if (displaySubtitle.length > availableForSubtitle) {
        if (availableForSubtitle > 3) {
          displaySubtitle = displaySubtitle.substring(0, availableForSubtitle - 3) + "...";
        } else if (availableForSubtitle > 0) {
          displaySubtitle = "...";
        } else {
          displaySubtitle = "";
        }
      }

      return (
        <List.Item
          key={commandForDetail.id}
          title={displayTitle}
          subtitle={displaySubtitle}
          accessories={accessories}
          actions={
            <ActionPanel>
              <Action
                title="Copy Keyword"
                icon={Icon.Clipboard}
                onAction={() => copyToClipboard(keyword.keyword, `Copied "${keyword.keyword}" to clipboard.`)}
              />
              <Action.Push
                title="Show Details"
                icon={Icon.Eye}
                target={<CommandDetail command={commandForDetail} thinkingKeyword={keyword} />}
              />
              {keyword.example && (
                <Action
                  title="Copy Example"
                  icon={Icon.Document}
                  onAction={() => copyToClipboard(keyword.example!, `Example: ${keyword.example} copied to clipboard`)}
                />
              )}
            </ActionPanel>
          }
          detail={<List.Item.Detail markdown={generateMarkdown(item)} />}
        />
      );
    }
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search commands, options, or keywords..."
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Category"
          value={selectedCategory}
          onChange={v => setSelectedCategory(v as CategoryType)}
        >
          <List.Dropdown.Item title="All Categories" value="all" />
          {categoryList.map(category => (
            <List.Dropdown.Item key={category.id} title={category.title} value={category.id} />
          ))}
        </List.Dropdown>
      }
    >
      {filteredSections.length > 0 ? (
        filteredSections.map(section => (
          <List.Section key={section.id} title={section.title}>
            {(section.commands || []).map(renderItem)}
            {(section.thinkingKeywords || []).map(renderItem)}
          </List.Section>
        ))
      ) : (
        <List.EmptyView
          title="No Commands Found"
          description="Couldn't find any commands matching your search. Try a different keyword."
          icon={Icon.MagnifyingGlass}
        />
      )}
    </List>
  );
}
