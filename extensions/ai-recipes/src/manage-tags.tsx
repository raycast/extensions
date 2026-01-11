import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  Form,
  useNavigation,
  showToast,
  Toast,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { Tag, TagColor, TAG_COLORS, Recipe } from "./types";
import { getTags, createTag, updateTag, deleteTag, getRecipes } from "./lib/storage";

export default function Command() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  const loadData = async () => {
    setIsLoading(true);
    const [loadedTags, loadedRecipes] = await Promise.all([getTags(), getRecipes()]);
    setTags(loadedTags);
    setRecipes(loadedRecipes);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const getTagColor = (tag: Tag): Color => {
    const colorMap: Record<string, Color> = {
      red: Color.Red,
      orange: Color.Orange,
      yellow: Color.Yellow,
      green: Color.Green,
      blue: Color.Blue,
      purple: Color.Purple,
      magenta: Color.Magenta,
      brown: Color.SecondaryText,
    };
    return colorMap[tag.color] || Color.PrimaryText;
  };

  const getRecipeCountForTag = (tagId: string): number => {
    return recipes.filter((recipe) => recipe.tagIds.includes(tagId)).length;
  };

  const handleDelete = async (tag: Tag) => {
    const recipeCount = getRecipeCountForTag(tag.id);
    const message =
      recipeCount > 0
        ? `"${tag.name}" is used by ${recipeCount} recipe(s). Deleting it will remove this tag from those recipes. Continue?`
        : `Are you sure you want to delete "${tag.name}"?`;

    const confirmed = await confirmAlert({
      title: "Delete Tag",
      message,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      await deleteTag(tag.id);
      await showToast({ style: Toast.Style.Success, title: "Tag deleted" });
      loadData();
    }
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search tags...">
      {tags.length === 0 ? (
        <List.EmptyView
          icon={Icon.Tag}
          title="No Tags"
          description="Create tags to organize your recipes"
          actions={
            <ActionPanel>
              <Action title="Create Tag" icon={Icon.Plus} onAction={() => push(<CreateTagForm onSave={loadData} />)} />
            </ActionPanel>
          }
        />
      ) : (
        tags.map((tag) => {
          const recipeCount = getRecipeCountForTag(tag.id);
          return (
            <List.Item
              key={tag.id}
              title={tag.name}
              icon={{ source: Icon.Tag, tintColor: getTagColor(tag) }}
              accessories={[
                { text: `${recipeCount} recipe${recipeCount !== 1 ? "s" : ""}`, icon: Icon.Wand },
                {
                  tag: {
                    value: TAG_COLORS.find((c) => c.value === tag.color)?.label || tag.color,
                    color: getTagColor(tag),
                  },
                },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Edit Tag"
                    icon={Icon.Pencil}
                    onAction={() => push(<EditTagForm tag={tag} onSave={loadData} />)}
                  />
                  <Action
                    title="Delete Tag"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                    onAction={() => handleDelete(tag)}
                  />
                  <Action
                    title="Create New Tag"
                    icon={Icon.Plus}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                    onAction={() => push(<CreateTagForm onSave={loadData} />)}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}

interface CreateTagFormProps {
  onSave?: () => void;
}

function CreateTagForm({ onSave }: CreateTagFormProps) {
  const { pop } = useNavigation();
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>("blue");

  const handleSubmit = async () => {
    if (!name.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Please enter tag name" });
      return;
    }

    try {
      await createTag(name.trim(), color as TagColor);
      await showToast({ style: Toast.Style.Success, title: "Tag created" });
      onSave?.();
      pop();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Create failed";
      await showToast({ style: Toast.Style.Failure, title: "Create failed", message });
    }
  };

  return (
    <Form
      navigationTitle="Create New Tag"
      actions={
        <ActionPanel>
          <Action title="Create" icon={Icon.Check} onAction={handleSubmit} />
          <Action title="Cancel" icon={Icon.XMarkCircle} onAction={pop} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Tag Name"
        placeholder="e.g., Social Media, Coding, Translation..."
        value={name}
        onChange={setName}
        autoFocus
      />
      <Form.Dropdown id="color" title="Color" value={color} onChange={setColor}>
        {TAG_COLORS.map((c) => (
          <Form.Dropdown.Item
            key={c.value}
            value={c.value}
            title={c.label}
            icon={{ source: Icon.Circle, tintColor: c.hex }}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

interface EditTagFormProps {
  tag: Tag;
  onSave?: () => void;
}

function EditTagForm({ tag, onSave }: EditTagFormProps) {
  const { pop } = useNavigation();
  const [name, setName] = useState(tag.name);
  const [color, setColor] = useState<string>(tag.color);

  const handleSubmit = async () => {
    if (!name.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Please enter tag name" });
      return;
    }

    try {
      await updateTag(tag.id, { name: name.trim(), color: color as TagColor });
      await showToast({ style: Toast.Style.Success, title: "Tag updated" });
      onSave?.();
      pop();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Update failed";
      await showToast({ style: Toast.Style.Failure, title: "Update failed", message });
    }
  };

  return (
    <Form
      navigationTitle={`Edit: ${tag.name}`}
      actions={
        <ActionPanel>
          <Action title="Save" icon={Icon.Check} onAction={handleSubmit} />
          <Action title="Cancel" icon={Icon.XMarkCircle} onAction={pop} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Tag Name"
        placeholder="e.g., Social Media, Coding, Translation..."
        value={name}
        onChange={setName}
        autoFocus
      />
      <Form.Dropdown id="color" title="Color" value={color} onChange={setColor}>
        {TAG_COLORS.map((c) => (
          <Form.Dropdown.Item
            key={c.value}
            value={c.value}
            title={c.label}
            icon={{ source: Icon.Circle, tintColor: c.hex }}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
