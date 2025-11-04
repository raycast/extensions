import { List, ActionPanel, Action, Icon, open, useNavigation } from "@raycast/api";
import { useState, useEffect } from "react";
import { discoverAllModules, ModuleInfo } from "./utils/moduleUtils";
import { CONTENT_CATEGORIES } from "./utils/categories";
import { showFailureToast } from "@raycast/utils";

interface ModuleGroup {
  type: number;
  typeName: string;
  icon: Icon;
  modules: ModuleInfo[];
  tag?: string; // For type 6 subcategories
}

function createTagBasedCategories(modules: ModuleInfo[]): ModuleGroup[] {
  const result: ModuleGroup[] = [];

  // Only create categories for canonical tags that exist in the data
  CONTENT_CATEGORIES.forEach((category) => {
    const modulesWithTag = modules.filter((module) => module.tags.includes(category.name));
    if (modulesWithTag.length > 0) {
      result.push({
        type: 6,
        typeName: category.name,
        icon: category.icon,
        modules: modulesWithTag,
        tag: category.name,
      });
    }
  });

  // Sort by module count (descending)
  return result.sort((a, b) => b.modules.length - a.modules.length);
}

function ModuleSearchList({ module }: { module: ModuleInfo }) {
  const { pop } = useNavigation();
  const [searchQuery, setSearchQuery] = useState("");

  const handleExecuteSearch = async () => {
    if (!searchQuery.trim()) {
      await showFailureToast("Please enter a search term");
      return;
    }

    try {
      // Use Accordance's search URL format for the specific module
      const url = `accord://search/${encodeURIComponent(module.name)}?${encodeURIComponent(searchQuery)}`;
      await open(url);
      pop(); // Go back to the main list after successful search
    } catch (error) {
      console.error("Failed to open Accordance search:", error);
      await showFailureToast("Failed to open Accordance search");
    }
  };

  return (
    <List
      searchText={searchQuery}
      onSearchTextChange={setSearchQuery}
      searchBarPlaceholder={`Search in ${module.abbreviation}...`}
    >
      <List.Item
        title={`Search "${searchQuery || "..."}" in ${module.abbreviation}`}
        subtitle={module.name}
        icon={Icon.MagnifyingGlass}
        accessories={[{ text: module.tags.slice(0, 2).join(", "), icon: Icon.Tag }]}
        actions={
          <ActionPanel>
            <Action title="Execute Search" onAction={handleExecuteSearch} icon={Icon.MagnifyingGlass} />
            <Action title="Back to Library" onAction={() => pop()} icon={Icon.ArrowLeft} />
          </ActionPanel>
        }
      />
    </List>
  );
}

export default function Command() {
  const [query, setQuery] = useState("");
  const [allModules, setAllModules] = useState<ModuleInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModuleType, setSelectedModuleType] = useState<string>("all");

  useEffect(() => {
    loadAllModules();
  }, []);

  async function loadAllModules() {
    try {
      const { allModules: modules } = await discoverAllModules();
      setAllModules(modules);
    } catch (error) {
      console.error("Failed to load modules:", error);
      await showFailureToast("Failed to discover Accordance modules");
    } finally {
      setLoading(false);
    }
  }

  // Group modules by type
  const standardModuleGroups: ModuleGroup[] = [
    {
      type: 1,
      typeName: "Bible Texts",
      icon: Icon.Book,
      modules: allModules.filter((m) => m.type === 1),
    },
    {
      type: 2,
      typeName: "Dictionaries",
      icon: Icon.Bookmark,
      modules: allModules.filter((m) => m.type === 2),
    },
    {
      type: 3,
      typeName: "Greek Lexicons",
      icon: Icon.Globe,
      modules: allModules.filter((m) => m.type === 3),
    },
    {
      type: 4,
      typeName: "Hebrew Lexicons",
      icon: Icon.Text,
      modules: allModules.filter((m) => m.type === 4),
    },
    {
      type: 5,
      typeName: "Commentaries",
      icon: Icon.SpeechBubbleActive,
      modules: allModules.filter((m) => m.type === 5),
    },
    {
      type: 0,
      typeName: "Other Tools",
      icon: Icon.WrenchScrewdriver,
      modules: allModules.filter((m) => ![1, 2, 3, 4, 5, 6].includes(m.type)),
    },
  ].filter((group) => group.modules.length > 0);

  // Get categorized tag-based groups (across all module types)
  const tagBasedGroups = createTagBasedCategories(allModules);

  // Combine all groups
  const moduleGroups = [...standardModuleGroups, ...tagBasedGroups];

  // Filter modules based on selected module type
  const filteredModules =
    selectedModuleType === "all"
      ? allModules
      : allModules.filter((module) => {
          if (selectedModuleType.startsWith("6-")) {
            // For tag-based filters (originally from type 6), match by tag across all module types
            const tag = selectedModuleType.substring(2);
            return module.tags.includes(tag);
          } else {
            // For other types, match by type number
            const typeNum = parseInt(selectedModuleType);
            if (selectedModuleType === "0") {
              // Special case for "Other Tools" (type 0 or types not 1-6)
              return ![1, 2, 3, 4, 5, 6].includes(module.type);
            }
            return module.type === typeNum;
          }
        });

  if (loading) {
    return <List isLoading={true} searchText={query} onSearchTextChange={setQuery} />;
  }

  return (
    <List
      searchText={query}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Filter modules..."
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by module type" value={selectedModuleType} onChange={setSelectedModuleType}>
          <List.Dropdown.Item title="All Types" value="all" icon={Icon.List} />
          {moduleGroups.map((group) => {
            const value = group.type === 6 ? `6-${group.tag}` : group.type.toString();
            const icon = group.icon || Icon.Book;

            // Calculate correct count for tag-based filters
            let count = group.modules.length;
            if (group.type === 6 && group.tag) {
              // For tag-based filters, count modules with this tag across all types
              count = allModules.filter((module) => module.tags.includes(group.tag!)).length;
            }

            return <List.Dropdown.Item key={value} title={`${group.typeName} (${count})`} value={value} icon={icon} />;
          })}
        </List.Dropdown>
      }
    >
      {filteredModules
        .filter((module) => {
          if (!query.trim()) return true;
          return (
            module.fullName.toLowerCase().includes(query.toLowerCase()) ||
            module.abbreviation.toLowerCase().includes(query.toLowerCase()) ||
            module.tags.some((tag) => tag.toLowerCase().includes(query.toLowerCase()))
          );
        })
        .slice(0, 50) // Limit to 50 items total for performance
        .map((module) => {
          // Determine icon based on module type or canonical tags
          let moduleIcon = Icon.Book;

          // First check if module has any canonical tags that should override the type-based icon
          const matchingTag = module.tags.find((tag) => CONTENT_CATEGORIES.some((cat) => cat.name === tag));

          if (matchingTag) {
            // Use icon based on canonical tag
            const category = CONTENT_CATEGORIES.find((cat) => cat.name === matchingTag);
            moduleIcon = category?.icon || Icon.Book;
          } else {
            // Fall back to type-based icons
            if (module.type === 1) moduleIcon = Icon.Book;
            else if (module.type === 2) moduleIcon = Icon.Bookmark;
            else if (module.type === 3) moduleIcon = Icon.Globe;
            else if (module.type === 4) moduleIcon = Icon.Text;
            else if (module.type === 5) moduleIcon = Icon.SpeechBubbleActive;
            else if (module.type === 6) moduleIcon = Icon.WrenchScrewdriver;
            else moduleIcon = Icon.WrenchScrewdriver;
          }

          return (
            <List.Item
              key={module.name}
              title={module.abbreviation}
              subtitle={module.name}
              accessories={[{ text: module.tags.slice(0, 2).join(", "), icon: Icon.Tag }]}
              icon={moduleIcon}
              actions={
                <ActionPanel>
                  <Action
                    title={`Open ${module.abbreviation}`}
                    onAction={async () => {
                      const url = `accord://read/${encodeURIComponent(module.name)}`;
                      try {
                        await open(url);
                      } catch (error) {
                        console.error("Failed to open module:", error);
                        await showFailureToast("Failed to open Accordance module");
                      }
                    }}
                    icon={Icon.Book}
                  />
                  <Action.Push
                    title={`Search in ${module.abbreviation}`}
                    target={<ModuleSearchList module={module} />}
                    icon={Icon.MagnifyingGlass}
                  />
                </ActionPanel>
              }
            />
          );
        })}
    </List>
  );
}
