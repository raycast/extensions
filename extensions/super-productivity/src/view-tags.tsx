import { useState, useEffect } from "react";
import { List, ActionPanel, Action, Icon, showToast, Toast, Color, Form, Alert, confirmAlert } from "@raycast/api";
import { getTags, createTag, deleteTag } from "./api";
import type { Tag } from "./types";

const TAG_COLORS = [
  { name: "Red", value: "#e57373" },
  { name: "Pink", value: "#f06292" },
  { name: "Purple", value: "#ba68c8" },
  { name: "Deep Purple", value: "#9575cd" },
  { name: "Indigo", value: "#7986cb" },
  { name: "Blue", value: "#64b5f6" },
  { name: "Light Blue", value: "#4fc3f7" },
  { name: "Cyan", value: "#4dd0e1" },
  { name: "Teal", value: "#4db6ac" },
  { name: "Green", value: "#81c784" },
  { name: "Light Green", value: "#aed581" },
  { name: "Lime", value: "#dce775" },
  { name: "Yellow", value: "#fff176" },
  { name: "Amber", value: "#ffd54f" },
  { name: "Orange", value: "#ffb74d" },
  { name: "Deep Orange", value: "#ff8a65" },
  { name: "Brown", value: "#a1887f" },
  { name: "Grey", value: "#bdbdbd" },
];

function TagColorIcon({ color }: { color?: string }) {
  if (!color) return Icon.Tag;
  return { source: Icon.CircleFilled, tintColor: color };
}

function CreateTagForm({ onCreated }: { onCreated: () => void }) {
  async function handleSubmit(values: { title: string; color: string }) {
    const title = values.title.trim();
    if (!title) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Tag name is required",
      });
      return;
    }

    try {
      await createTag({
        title,
        color: values.color || undefined,
      });
      await showToast({
        style: Toast.Style.Success,
        title: "Tag created",
        message: values.title,
      });
      onCreated();
    } catch (e) {
      console.error("Failed to create tag:", e);
    }
  }

  return (
    <Form
      navigationTitle="Create Tag"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Tag" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Tag Name" placeholder="e.g., Urgent, Today, Focus" autoFocus />
      <Form.Dropdown id="color" title="Color" defaultValue="">
        <Form.Dropdown.Item title="None" value="" />
        {TAG_COLORS.map((color) => (
          <Form.Dropdown.Item
            key={color.value}
            title={color.name}
            value={color.value}
            icon={{ source: Icon.CircleFilled, tintColor: color.value }}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

export default function Command() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function fetchTags() {
    setIsLoading(true);
    try {
      const fetchedTags = await getTags();
      setTags(fetchedTags);
    } catch (e) {
      console.error("Failed to fetch tags:", e);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchTags();
  }, []);

  async function handleDeleteTag(tag: Tag) {
    if (
      await confirmAlert({
        title: "Delete Tag",
        message: `Delete "${tag.title}"? Tasks with this tag will not be deleted.`,
        icon: Icon.Trash,
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      try {
        await deleteTag(tag.id);
        await showToast({
          style: Toast.Style.Success,
          title: "Tag deleted",
          message: tag.title,
        });
        fetchTags();
      } catch (e) {
        console.error("Failed to delete tag:", e);
      }
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search tags...">
      {tags.map((tag) => (
        <List.Item
          key={tag.id}
          title={tag.title}
          icon={TagColorIcon({ color: tag.color })}
          accessories={tag.color ? [{ text: tag.color }] : []}
          keywords={[tag.title, tag.color || ""]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Create Tag"
                icon={Icon.Plus}
                target={<CreateTagForm onCreated={fetchTags} />}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
              />
              <Action
                title="Delete Tag"
                icon={{ source: Icon.Trash, tintColor: Color.Red }}
                style={Action.Style.Destructive}
                onAction={() => handleDeleteTag(tag)}
                shortcut={{ modifiers: ["cmd"], key: "backspace" }}
              />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={fetchTags}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      ))}
      {!isLoading && tags.length === 0 && (
        <List.EmptyView
          icon={Icon.Tag}
          title="No tags found"
          description="Create a tag to organize your tasks."
          actions={
            <ActionPanel>
              <Action.Push title="Create Tag" icon={Icon.Plus} target={<CreateTagForm onCreated={fetchTags} />} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
