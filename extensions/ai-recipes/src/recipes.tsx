import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  useNavigation,
  showToast,
  Toast,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { Recipe, Tag } from "./types";
import { getRecipes, getTags, deleteRecipe, duplicateRecipe, initializeDefaultData } from "./lib/storage";
import { UseRecipeView } from "./components/UseRecipeView";
import { EditRecipeForm } from "./components/EditRecipeForm";
import { HistoryView } from "./components/HistoryView";

export default function Command() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagId, setSelectedTagId] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  const loadData = async () => {
    setIsLoading(true);
    await initializeDefaultData();
    const [loadedRecipes, loadedTags] = await Promise.all([getRecipes(), getTags()]);
    loadedRecipes.sort((a, b) => {
      if (a.lastUsedAt && b.lastUsedAt) return b.lastUsedAt - a.lastUsedAt;
      if (a.lastUsedAt) return -1;
      if (b.lastUsedAt) return 1;
      return b.usageCount - a.usageCount;
    });
    setRecipes(loadedRecipes);
    setTags(loadedTags);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredRecipes =
    selectedTagId === "all" ? recipes : recipes.filter((recipe) => recipe.tagIds.includes(selectedTagId));

  const handleDelete = async (recipe: Recipe) => {
    const confirmed = await confirmAlert({
      title: "Delete Recipe",
      message: `Are you sure you want to delete "${recipe.name}"? This action cannot be undone.`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      await deleteRecipe(recipe.id);
      await showToast({ style: Toast.Style.Success, title: "Recipe deleted" });
      loadData();
    }
  };

  const handleDuplicate = async (recipe: Recipe) => {
    await duplicateRecipe(recipe.id);
    await showToast({ style: Toast.Style.Success, title: "Recipe duplicated" });
    loadData();
  };

  const getTagsForRecipe = (recipe: Recipe): Tag[] => {
    return recipe.tagIds.map((tagId) => tags.find((t) => t.id === tagId)).filter(Boolean) as Tag[];
  };

  const getTagColor = (tag: Tag): Color => {
    const colorMap: Record<string, Color> = {
      red: Color.Red,
      orange: Color.Orange,
      yellow: Color.Yellow,
      green: Color.Green,
      blue: Color.Blue,
      purple: Color.Purple,
      magenta: Color.Magenta,
      brown: Color.Brown,
    };
    return colorMap[tag.color] || Color.PrimaryText;
  };

  const formatDate = (timestamp?: number): string => {
    if (!timestamp) return "Never used";
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search recipes..."
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by tag" storeValue onChange={setSelectedTagId}>
          <List.Dropdown.Item title="All Recipes" value="all" icon={Icon.AppWindowGrid3x3} />
          <List.Dropdown.Section title="Tags">
            {tags.map((tag) => (
              <List.Dropdown.Item
                key={tag.id}
                title={tag.name}
                value={tag.id}
                icon={{ source: Icon.Tag, tintColor: getTagColor(tag) }}
              />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {filteredRecipes.length === 0 ? (
        <List.EmptyView
          icon={Icon.Wand}
          title="No Recipes"
          description="Create your first AI recipe to get started"
          actions={
            <ActionPanel>
              <Action
                title="Create Recipe"
                icon={Icon.Plus}
                onAction={() => push(<EditRecipeForm onSave={loadData} />)}
              />
            </ActionPanel>
          }
        />
      ) : (
        filteredRecipes.map((recipe) => {
          const recipeTags = getTagsForRecipe(recipe);
          return (
            <List.Item
              key={recipe.id}
              title={recipe.name}
              subtitle={recipe.description}
              keywords={[recipe.name, recipe.description || "", ...recipeTags.map((t) => t.name)]}
              accessories={[
                ...(recipe.inputType && recipe.outputType
                  ? [{ text: `${recipe.inputType} → ${recipe.outputType}`, icon: Icon.ArrowRight }]
                  : []),
                ...recipeTags.map((tag) => ({
                  tag: { value: tag.name, color: getTagColor(tag) },
                })),
                { text: formatDate(recipe.lastUsedAt), tooltip: `Used ${recipe.usageCount} times` },
              ]}
              icon={{ source: Icon.Wand, tintColor: Color.Purple }}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Use">
                    <Action
                      title="Use Recipe"
                      icon={Icon.Play}
                      onAction={() => push(<UseRecipeView recipe={recipe} onComplete={loadData} />)}
                    />
                    <Action
                      title="View History"
                      icon={Icon.Clock}
                      shortcut={{ modifiers: ["cmd"], key: "h" }}
                      onAction={() => push(<HistoryView recipe={recipe} />)}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Manage">
                    <Action
                      title="Edit Recipe"
                      icon={Icon.Pencil}
                      shortcut={{ modifiers: ["cmd"], key: "e" }}
                      onAction={() => push(<EditRecipeForm recipe={recipe} onSave={loadData} />)}
                    />
                    <Action
                      title="Duplicate Recipe"
                      icon={Icon.CopyClipboard}
                      shortcut={{ modifiers: ["cmd"], key: "d" }}
                      onAction={() => handleDuplicate(recipe)}
                    />
                    <Action
                      title="Delete Recipe"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                      onAction={() => handleDelete(recipe)}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="New">
                    <Action
                      title="Create New Recipe"
                      icon={Icon.Plus}
                      shortcut={{ modifiers: ["cmd"], key: "n" }}
                      onAction={() => push(<EditRecipeForm onSave={loadData} />)}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
