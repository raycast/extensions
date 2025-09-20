/* eslint-disable @raycast/prefer-title-case */
import { List, ActionPanel, Action, Icon, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import type { Website, Category, ActionType } from "./types";
import {
  fetchWebsitesData,
  getCategoryIcon,
  getDomainWithoutProtocol,
  formatCategoryName,
  handleWebsiteAction,
  DEFAULT_ACTION,
  shouldShowViewLlmsAction,
} from "./utils";

interface Preferences {
  primaryAction: ActionType;
  defaultCategory: Category;
  showDescriptions: boolean;
}

// Category filter type including "all"
type CategoryFilter = Category | "all";

function getUniqueKey(website: Website, index: number): string {
  // Combine multiple fields to create a unique key
  const baseKey = `${website.domain}-${website.name}-${website.llmsTxtUrl}`;
  // Add index as fallback to ensure uniqueness even if all fields are identical
  return `${baseKey}-${index}`;
}

function getCategoryCount(websites: Website[], category: Category): number {
  return websites.filter((website) => website.category === category).length;
}

function getPrimaryAction(website: Website, preferences: Preferences) {
  const action = preferences.primaryAction || DEFAULT_ACTION;

  switch (action) {
    case "copy_llms":
      return (
        <Action
          title="Copy llms.txt URL"
          icon={Icon.Clipboard}
          onAction={() => handleWebsiteAction(website, "copy_llms")}
        />
      );
    case "view_llms_full":
      return website.llmsFullTxtUrl ? (
        <Action
          title="View llms-full.txt"
          icon={Icon.Globe}
          onAction={() => handleWebsiteAction(website, "view_llms_full")}
        />
      ) : (
        <Action title="View llms.txt" icon={Icon.Globe} onAction={() => handleWebsiteAction(website, DEFAULT_ACTION)} />
      );
    case "copy_llms_full":
      return website.llmsFullTxtUrl ? (
        <Action
          title="Copy llms-full.txt URL"
          icon={Icon.Clipboard}
          onAction={() => handleWebsiteAction(website, "copy_llms_full")}
        />
      ) : (
        <Action
          title="Copy llms.txt URL"
          icon={Icon.Clipboard}
          onAction={() => handleWebsiteAction(website, "copy_llms")}
        />
      );
    default:
      return (
        <Action title="View llms.txt" icon={Icon.Globe} onAction={() => handleWebsiteAction(website, DEFAULT_ACTION)} />
      );
  }
}

function getSecondaryActions(website: Website, preferences: Preferences) {
  const primaryAction = preferences.primaryAction || DEFAULT_ACTION;
  const actions = [];

  // Add View llms.txt if it's not the primary action
  if (shouldShowViewLlmsAction(primaryAction, !!website.llmsFullTxtUrl)) {
    actions.push(
      <Action
        key="view-llms"
        title="View llms.txt"
        icon={Icon.Globe}
        onAction={() => handleWebsiteAction(website, DEFAULT_ACTION)}
      />,
    );
  }

  // Add View llms-full.txt if available and not the primary action
  if (website.llmsFullTxtUrl && primaryAction !== "view_llms_full") {
    actions.push(
      <Action
        key="view-llms-full"
        title="View llms-full.txt"
        icon={Icon.Globe}
        onAction={() => handleWebsiteAction(website, "view_llms_full")}
      />,
    );
  }

  // Always add Visit Website
  actions.push(<Action.OpenInBrowser key="visit-website" title="Visit Website" url={website.domain} />);

  // Add Copy submenu with appropriate items
  const copyItems = [];

  // Always add Copy Domain
  copyItems.push(
    <Action.CopyToClipboard
      key="copy-domain"
      title="Copy Domain"
      content={getDomainWithoutProtocol(website.domain)}
      shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
    />,
  );

  // Always add Copy llms.txt
  copyItems.push(
    <Action
      key="copy-llms"
      title="Copy llms.txt URL"
      icon={Icon.Clipboard}
      onAction={() => handleWebsiteAction(website, "copy_llms")}
      shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
    />,
  );

  // Add Copy llms-full.txt if available
  if (website.llmsFullTxtUrl) {
    copyItems.push(
      <Action
        key="copy-llms-full"
        title="Copy llms-full.txt URL"
        icon={Icon.Clipboard}
        onAction={() => handleWebsiteAction(website, "copy_llms_full")}
        shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
      />,
    );
  }

  if (copyItems.length > 0) {
    actions.push(
      <ActionPanel.Submenu key="copy" icon={Icon.Clipboard} title="Copy">
        {copyItems}
      </ActionPanel.Submenu>,
    );
  }

  return actions;
}

const categories: Category[] = [
  "ai-ml",
  "data-analytics",
  "developer-tools",
  "infrastructure-cloud",
  "integration-automation",
  "security-identity",
  "other",
];

export default function SearchWebsites() {
  const [isLoading, setIsLoading] = useState(true);
  const [websites, setWebsites] = useState<Website[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const preferences = getPreferenceValues<Preferences>();
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>(preferences.defaultCategory);

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await fetchWebsitesData();
        setWebsites(data);
      } catch (e) {
        setError(e instanceof Error ? e : new Error("An error occurred"));
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  const filteredWebsites =
    categoryFilter === "all" ? websites : websites.filter((website) => website.category === categoryFilter);

  if (error) {
    return (
      <List isLoading={isLoading}>
        <List.EmptyView icon={Icon.ExclamationMark} title="Error" description={error.message} />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search websites with llms.txt..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Category"
          onChange={(newValue) => setCategoryFilter(newValue as CategoryFilter)}
          value={categoryFilter}
        >
          <List.Dropdown.Item key="all" title="All Categories" value="all" icon={Icon.List} />
          {categories.map((category) => (
            <List.Dropdown.Item
              key={category}
              title={`${formatCategoryName(category)} (${getCategoryCount(websites, category)})`}
              value={category}
              icon={getCategoryIcon(category)}
            />
          ))}
        </List.Dropdown>
      }
      throttle={true}
    >
      {filteredWebsites.map((website, index) => (
        <List.Item
          key={getUniqueKey(website, index)}
          title={website.name}
          subtitle={preferences.showDescriptions ? website.description : getDomainWithoutProtocol(website.domain)}
          accessories={[
            ...(preferences.showDescriptions ? [{ text: getDomainWithoutProtocol(website.domain) }] : []),
            { text: `${getCategoryIcon(website.category)} ${formatCategoryName(website.category)}` },
          ]}
          icon={website.favicon}
          actions={
            <ActionPanel>
              {getPrimaryAction(website, preferences)}
              {getSecondaryActions(website, preferences)}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
