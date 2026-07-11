import { Action, ActionPanel, Grid, Icon, List } from "@raycast/api";
import { useMemo, useState } from "react";
import { CharacterDetail } from "./components/CharacterDetail";
import { CHARACTERS, CATEGORY_LABELS } from "./data/characters";
import { CharacterCategory } from "./types/character";
import { getCharacterKeywords, sortCharacters } from "./utils/search";

type ViewMode = "list" | "grid";
type SortMode = "name-en" | "name-jp";
type CategoryFilter = "all" | CharacterCategory;

const CATEGORY_FILTER_OPTIONS: Array<{ value: CategoryFilter; title: string }> = [
  { value: "all", title: "All Categories" },
  { value: "main", title: "Main Trio" },
  { value: "friends", title: "Friends" },
  { value: "yoroi-san", title: "Yoroi-san" },
];

export default function SearchCharactersCommand() {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [sortMode, setSortMode] = useState<SortMode>("name-en");
  const [category, setCategory] = useState<CategoryFilter>("all");

  const filtered = useMemo(() => {
    const byCategory = category === "all" ? CHARACTERS : CHARACTERS.filter((item) => item.category === category);
    return sortCharacters(byCategory, sortMode);
  }, [category, sortMode]);

  if (viewMode === "grid") {
    return (
      <Grid
        columns={5}
        fit={Grid.Fit.Fill}
        searchBarPlaceholder="Search by EN / JP / romanized / keyword..."
        searchBarAccessory={
          <Grid.Dropdown tooltip="Category" onChange={(value) => setCategory(value as CategoryFilter)} value={category}>
            {CATEGORY_FILTER_OPTIONS.map((option) => (
              <Grid.Dropdown.Item key={option.value} value={option.value} title={option.title} />
            ))}
          </Grid.Dropdown>
        }
      >
        <Grid.Section title={`Characters (${filtered.length})`}>
          {filtered.map((character) => (
            <Grid.Item
              key={character.id}
              content={character.icon}
              title={character.nameEn}
              subtitle={character.nameJp}
              keywords={getCharacterKeywords(character)}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action.Push
                      title="Open Character Detail"
                      icon={Icon.Eye}
                      target={<CharacterDetail character={character} />}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="View">
                    <Action title="Switch to List View" icon={Icon.List} onAction={() => setViewMode("list")} />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Sort">
                    <Action
                      title={sortMode === "name-en" ? "Sort by Japanese Name" : "Sort by English Name"}
                      icon={Icon.CheckList}
                      onAction={() => setSortMode(sortMode === "name-en" ? "name-jp" : "name-en")}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </Grid.Section>
      </Grid>
    );
  }

  return (
    <List
      searchBarPlaceholder="Search by EN / JP / romanized / keyword..."
      searchBarAccessory={
        <List.Dropdown tooltip="Category" onChange={(value) => setCategory(value as CategoryFilter)} value={category}>
          {CATEGORY_FILTER_OPTIONS.map((option) => (
            <List.Dropdown.Item key={option.value} value={option.value} title={option.title} />
          ))}
        </List.Dropdown>
      }
    >
      {filtered.map((character) => (
        <List.Item
          key={character.id}
          icon={character.icon}
          title={character.nameEn}
          subtitle={character.nameJp}
          accessories={[{ text: CATEGORY_LABELS[character.category] }]}
          keywords={getCharacterKeywords(character)}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.Push
                  title="Open Character Detail"
                  icon={Icon.Eye}
                  target={<CharacterDetail character={character} />}
                />
              </ActionPanel.Section>
              <ActionPanel.Section title="View">
                <Action
                  title={viewMode === "list" ? "Switch to Grid View" : "Switch to List View"}
                  icon={Icon.AppWindowGrid2x2}
                  onAction={() => setViewMode(viewMode === "list" ? "grid" : "list")}
                />
              </ActionPanel.Section>
              <ActionPanel.Section title="Sort">
                <Action
                  title={sortMode === "name-en" ? "Sort by Japanese Name" : "Sort by English Name"}
                  icon={Icon.CheckList}
                  onAction={() => setSortMode(sortMode === "name-en" ? "name-jp" : "name-en")}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
      <List.EmptyView
        icon={Icon.MagnifyingGlass}
        title="No Characters"
        description="Try another category filter or clear your search query."
      />
    </List>
  );
}
