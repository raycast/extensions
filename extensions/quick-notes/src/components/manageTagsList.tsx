import { Action, ActionPanel, Alert, Color, Icon, Keyboard, List, Toast, confirmAlert, showToast } from "@raycast/api";
import { useAtom } from "jotai";
import { notesAtom, tagsAtom } from "../services/atoms";
import { getTintColor, isMacOS } from "../utils/utils";
import CreateEditTagForm from "./createEditTagForm";

const TagsList = () => {
  const [tags, setTags] = useAtom(tagsAtom);
  const [notes] = useAtom(notesAtom);

  const noteCount = (tagName: string) => notes.filter((note) => note.tags.includes(tagName)).length;

  const deleteTag = async (tagName: string) => {
    if (
      await confirmAlert({
        icon: { source: Icon.Trash, tintColor: Color.Red },
        title: `Delete tag "${tagName}"?`,
        message: "This tag will be removed from all notes.",
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      await setTags(tags.filter((t) => t.name !== tagName));
      showToast({ style: Toast.Style.Success, title: "Tag Deleted" });
    }
  };

  const deleteAllTags = async () => {
    if (tags.length === 0) {
      return;
    }
    if (
      await confirmAlert({
        icon: { source: Icon.Trash, tintColor: Color.Red },
        title: "Delete all tags?",
        message: `This will delete all ${tags.length} tags and remove them from all notes.`,
        primaryAction: { title: "Delete All", style: Alert.ActionStyle.Destructive },
      })
    ) {
      await setTags([]);
      showToast({ style: Toast.Style.Success, title: "Deleted All Tags" });
    }
  };

  return (
    <List navigationTitle="Manage Tags" searchBarPlaceholder="Search Tags">
      {tags.length > 0 ? (
        <List.Section title={`${tags.length} tag${tags.length === 1 ? "" : "s"}`}>
          {tags.map((tag, index) => {
            const count = noteCount(tag.name);
            return (
              <List.Item
                key={index}
                title={tag.name}
                icon={{ source: "dot.png", tintColor: getTintColor(tag.color) }}
                accessories={[{ text: `${count} note${count === 1 ? "" : "s"}` }]}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="Edit Tag"
                      icon={{ source: Icon.Pencil, tintColor: getTintColor("sky") }}
                      target={<CreateEditTagForm tag={tag} />}
                      shortcut={Keyboard.Shortcut.Common.Edit}
                    />
                    <Action.Push
                      title="Create Tag"
                      icon={{ source: Icon.PlusSquare, tintColor: getTintColor("green") }}
                      target={<CreateEditTagForm />}
                      shortcut={Keyboard.Shortcut.Common.New}
                    />
                    <Action
                      title="Delete Tag"
                      icon={{ source: Icon.Trash, tintColor: getTintColor("red") }}
                      shortcut={Keyboard.Shortcut.Common.Remove}
                      onAction={() => deleteTag(tag.name)}
                    />
                    <Action
                      title="Delete All Tags"
                      icon={{ source: Icon.Trash, tintColor: getTintColor("red") }}
                      shortcut={Keyboard.Shortcut.Common.RemoveAll}
                      onAction={deleteAllTags}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ) : (
        <List.EmptyView
          title={`${isMacOS ? "⌘ + N" : "Ctrl + N"} to create a new tag`}
          actions={
            <ActionPanel>
              <Action.Push title="Create Tag" target={<CreateEditTagForm />} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
};

export default TagsList;
