import { ActionPanel, Action, List, Icon, Color, LaunchProps, getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useMemo } from "react";
import removeMarkdown from "remove-markdown";

import {
  AddSelectedToRaycastAction,
  buildSharingLink,
  CatalogDropdown,
  CatalogSelectionActions,
  CopyShareUrlAction,
  filterCatalogGroups,
  getSelectedItemIds,
  ToggleSelectionAction,
  useCatalogSelection,
} from "./catalog";
import { SnippetCategory } from "./data/snippets";
import { addModifiersToKeyword, platformShortcut, wrapInCodeBlock } from "./helpers";

type Props = LaunchProps<{ launchContext: string[] }>;

export default function ExploreSnippets(props: Props) {
  const { data: rawCategories, isLoading } = useFetch<SnippetCategory[]>(`https://ray.so/api/snippets`);
  const { selectedIds, setSelectedIds, selectedCategory, setSelectedCategory, toggleSelection } = useCatalogSelection(
    props.launchContext,
  );
  const preferences = getPreferenceValues<Preferences.ExploreSnippets>();

  const categories = useMemo(() => {
    return (
      rawCategories?.map((category) => {
        return {
          ...category,
          snippets: category.snippets.map((snippet) => {
            const keyword =
              snippet.type === "spelling"
                ? snippet.keyword
                : addModifiersToKeyword({
                    keyword: snippet.keyword,
                    start: preferences.startModifier,
                    end: preferences.endModifier,
                  });

            return {
              ...snippet,
              keyword,
              keywords: removeMarkdown(snippet.text)
                .replace(/\n/gi, " ")
                .split(" ")
                .map((k) => k.trim())
                .filter((k) => k.length > 0),
            };
          }),
        };
      }) ?? []
    );
  }, [preferences, rawCategories]);

  function getSnippetMarkdown(snippet: SnippetCategory["snippets"][number]) {
    if (snippet.type === "code") {
      return wrapInCodeBlock(snippet.text, snippet.language);
    }

    if (snippet.type === "template" && snippet.hasMarkdown) {
      return `## Template\n\n${wrapInCodeBlock(snippet.text)}\n\n## Markdown Output\n\n${snippet.text}`;
    }

    if (snippet.type === "template") {
      const text = snippet.text.replace(/\{[^{}]+\}/g, "**$&**");
      return text;
    }

    return snippet.text;
  }

  const addToRaycastUrl = useMemo(() => {
    const snippets = categories
      .flatMap((category) => category.snippets)
      .filter((snippet) => selectedIds.includes(snippet.id));

    const protocol = `${process.env.RAYCAST_SCHEME ?? "raycast"}://`;

    const queryString = snippets
      .map((snippet) => {
        const { name, text, type, keyword } = snippet;

        return `snippet=${encodeURIComponent(JSON.stringify({ name, text, keyword, type }))}`;
      })
      .join("&");

    return `${protocol}snippets/import?${queryString}`;
  }, [selectedIds, categories]);

  const sharingLink = buildSharingLink(
    getSelectedItemIds(
      categories.map((category) => category.snippets),
      selectedIds,
    ),
  );

  const filteredCategories = useMemo(() => {
    return filterCatalogGroups(
      categories,
      selectedCategory,
      selectedIds,
      (category) => category.snippets,
      (category, snippets) => ({ ...category, snippets }),
    );
  }, [selectedCategory, categories, selectedIds]);

  const selectSnippetsTitle = useMemo(() => {
    const category = categories.find((category) => category.slug === selectedCategory);
    if (category) {
      return `All ${category.name} Snippets`;
    }

    return "All Snippets";
  }, [selectedCategory, categories]);

  const filteredSnippetIds = filteredCategories.flatMap((category) => category.snippets).map((prompt) => prompt.id);
  const hasSelectedSnippets = selectedIds.length > 0;

  return (
    <List
      isShowingDetail
      isLoading={isLoading}
      searchBarPlaceholder="Filter by name, category, or text"
      searchBarAccessory={
        <CatalogDropdown
          categories={categories}
          selectedCategory={selectedCategory}
          onChange={setSelectedCategory}
          isLoading={isLoading}
          selectedItemsTitle={hasSelectedSnippets ? "Selected Snippets" : undefined}
        />
      }
    >
      {filteredCategories.map((category) => (
        <List.Section key={category.name} title={category.name}>
          {category.snippets.map((snippet) => {
            const isSelected = selectedIds.includes(snippet.id);
            return (
              <List.Item
                key={snippet.id}
                title={snippet.name}
                subtitle={snippet.keyword}
                icon={isSelected ? { source: Icon.CheckCircle, tintColor: Color.Green } : undefined}
                keywords={[category.name, ...snippet.keywords]}
                detail={<List.Item.Detail markdown={getSnippetMarkdown(snippet)} />}
                actions={
                  <ActionPanel>
                    <ToggleSelectionAction
                      isSelected={isSelected}
                      itemType="Snippet"
                      onToggle={() => toggleSelection(snippet.id)}
                    />

                    {hasSelectedSnippets ? <AddSelectedToRaycastAction target={addToRaycastUrl} /> : null}

                    {hasSelectedSnippets ? <CopyShareUrlAction content={sharingLink} /> : null}
                    <ActionPanel.Section>
                      <CatalogSelectionActions
                        selectedIds={selectedIds}
                        setSelectedIds={setSelectedIds}
                        filteredIds={filteredSnippetIds}
                        selectTitle={selectSnippetsTitle}
                      />
                    </ActionPanel.Section>

                    <ActionPanel.Section>
                      <Action.CopyToClipboard
                        title="Copy Snippet Text"
                        shortcut={platformShortcut(["cmd"], ".")}
                        content={snippet.text}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}
