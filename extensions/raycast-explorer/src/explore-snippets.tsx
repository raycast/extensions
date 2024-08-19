import { ActionPanel, Action, List, Icon, Color, environment, LaunchProps, getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useMemo, useState } from "react";
import removeMarkdown from "remove-markdown";

import { SnippetCategory } from "./data/snippets";
import { CONTRIBUTE_URL, getIcon, wrapInCodeBlock } from "./helpers";

type Props = LaunchProps<{ launchContext: string[] }>;

function addModifiersToKeyword({
  keyword,
  start,
  end,
}: {
  keyword: string;
  start: Preferences.ExploreSnippets["startModifier"];
  end: Preferences.ExploreSnippets["endModifier"];
}) {
  if (!keyword) return keyword;
  return `${start === "none" ? "" : start}${keyword}${end === "none" ? "" : end}`;
}

export default function ExploreSnippets(props: Props) {
  const { data: rawCategories, isLoading } = useFetch<SnippetCategory[]>(`https://ray.so/api/snippets`);
  const [selectedIds, setSelectedIds] = useState<string[]>(props.launchContext ?? []);
  const [selectedCategory, setSelectedCategory] = useState(props.launchContext ? "selected" : "");
  const preferences = getPreferenceValues<Preferences.ExploreSnippets>();

  function toggleSelect(id: string) {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((selectedId) => selectedId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  }

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

    const protocol = environment.raycastVersion.includes("alpha") ? "raycastinternal://" : "raycast://";

    const queryString = snippets
      .map((snippet) => {
        const { name, text, type, keyword } = snippet;

        return `snippet=${encodeURIComponent(JSON.stringify({ name, text, keyword, type }))}`;
      })
      .join("&");

    return `${protocol}snippets/import?${queryString}`;
  }, [selectedIds, categories]);

  const sharingLink = useMemo(() => {
    const snippets = categories
      .flatMap((category) => category.snippets)
      .filter((snippet) => selectedIds.includes(snippet.id));

    const { extensionName, commandName, raycastVersion } = environment;
    const protocol = raycastVersion.includes("alpha") ? "raycastinternal://" : "raycast://";
    const baseLink = `${protocol}extensions/thomaslombart/${extensionName}/${commandName}`;

    return `${baseLink}?launchContext=${encodeURIComponent(JSON.stringify(snippets.map((snippet) => snippet.id)))}`;
  }, [selectedIds, categories]);

  const filteredCategories = useMemo(() => {
    if (selectedCategory === "") {
      return categories;
    }

    if (selectedCategory === "selected") {
      return categories.map((category) => {
        return {
          ...category,
          snippets: category.snippets.filter((snippet) => selectedIds.includes(snippet.id)),
        };
      });
    }

    return categories.filter((category) => category.slug === selectedCategory);
  }, [selectedCategory, categories, selectedIds]);

  const selectSnippetsTitle = useMemo(() => {
    const category = categories.find((category) => category.slug === selectedCategory);
    if (category) {
      return `All ${category.name} Snippets`;
    }

    return "All Snippets";
  }, [selectedCategory, categories]);

  const filteredSnippetIds = filteredCategories.flatMap((category) => category.snippets).map((prompt) => prompt.id);
  const selectedFilteredSnippetsCount = selectedIds.filter((id) => filteredSnippetIds.includes(id)).length;
  const showSelectAllSnippetsAction = selectedFilteredSnippetsCount !== filteredSnippetIds.length;
  const hasSelectedSnippets = selectedIds.length > 0;

  return (
    <List
      isShowingDetail
      isLoading={isLoading}
      searchBarPlaceholder="Filter by name, category, or text"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Category"
          onChange={setSelectedCategory}
          value={selectedCategory}
          isLoading={isLoading}
        >
          <List.Dropdown.Item icon={Icon.BulletPoints} title="All Categories" value="" />
          {hasSelectedSnippets ? (
            <List.Dropdown.Item icon={Icon.CheckCircle} title="Selected Snippets" value="selected" />
          ) : null}

          <List.Dropdown.Section title="Categories">
            {categories.map((category) => {
              const icon = getIcon(category.icon || "");
              return (
                <List.Dropdown.Item
                  icon={Icon[icon] ?? Icon.List}
                  key={category.slug}
                  title={category.name}
                  value={category.slug}
                />
              );
            })}
          </List.Dropdown.Section>
        </List.Dropdown>
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
                    {isSelected ? (
                      <Action title="Unselect Snippet" icon={Icon.Circle} onAction={() => toggleSelect(snippet.id)} />
                    ) : (
                      <Action
                        title="Select Snippet"
                        icon={Icon.CheckCircle}
                        onAction={() => toggleSelect(snippet.id)}
                      />
                    )}

                    {hasSelectedSnippets ? (
                      <Action.Open title="Add to Raycast" icon={Icon.RaycastLogoNeg} target={addToRaycastUrl} />
                    ) : null}

                    {hasSelectedSnippets ? (
                      <Action.CopyToClipboard
                        title="Copy URL to Share"
                        shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                        icon={Icon.Link}
                        content={sharingLink}
                      />
                    ) : null}
                    <ActionPanel.Section>
                      {showSelectAllSnippetsAction ? (
                        <Action
                          title={`Select ${selectSnippetsTitle}`}
                          icon={Icon.CheckCircle}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                          onAction={() =>
                            setSelectedIds((ids) => [
                              ...ids.filter((id) => !filteredSnippetIds.includes(id)),
                              ...filteredSnippetIds,
                            ])
                          }
                        />
                      ) : null}
                      {hasSelectedSnippets ? (
                        <Action
                          title={`Unselect ${selectSnippetsTitle}`}
                          icon={Icon.Circle}
                          shortcut={{ modifiers: ["opt", "shift"], key: "a" }}
                          onAction={() => {
                            setSelectedIds(selectedIds.filter((id) => !filteredSnippetIds.includes(id)));
                          }}
                        />
                      ) : null}
                      <Action.OpenInBrowser
                        title="Contribute"
                        icon={Icon.PlusSquare}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                        url={CONTRIBUTE_URL}
                      />
                    </ActionPanel.Section>

                    <ActionPanel.Section>
                      <Action.CopyToClipboard
                        title="Copy Snippet Text"
                        shortcut={{ modifiers: ["cmd"], key: "." }}
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
