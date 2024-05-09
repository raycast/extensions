import { ActionPanel, Action, Icon, Clipboard, showToast, Toast } from "@raycast/api";
import CreateEditNoteForm from "./createEditNoteForm";
import CreateTag from "./createTag";
import DeleteNoteAction from "./deleteNoteAction";
import { colors } from "../utils/utils";
import { tagsAtom } from "../services/atoms";
import { useAtom } from "jotai";
import DeleteTags from "./deleteTags";

const Actions = ({
  noNotes,
  onTagFilter,
  isDraft = false,
  title,
  note,
  tags,
  createdAt,
}: {
  noNotes: boolean;
  onTagFilter: (tag: string) => void;
  isDraft?: boolean;
  title?: string;
  note?: string;
  tags?: string[];
  createdAt?: Date;
}) => {
  const [allTags] = useAtom(tagsAtom);
  return (
    <ActionPanel>
      <ActionPanel.Section>
        {!noNotes && (
          <>
            <Action.Push
              title="Edit Note"
              icon={{
                source: Icon.Pencil,
                tintColor: colors.find((c) => c.name === "sky")?.tintColor,
              }}
              target={
                <CreateEditNoteForm isDraft={isDraft} title={title} note={note} tags={tags} createdAt={createdAt} />
              }
            />
            <Action
              title="Copy Note"
              icon={{ source: Icon.CopyClipboard, tintColor: colors.find((c) => c.name === "turquoise")?.tintColor }}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              onAction={() => {
                Clipboard.copy(note ?? "").then(() => {
                  showToast({ style: Toast.Style.Success, title: "Note Copied" });
                });
              }}
            />
          </>
        )}
        <Action.Push
          title="New Note"
          icon={{
            source: Icon.PlusSquare,
            tintColor: colors.find((c) => c.name === "green")?.tintColor,
          }}
          target={<CreateEditNoteForm isDraft={true} />}
          shortcut={{ modifiers: ["cmd"], key: "n" }}
        />
        {!noNotes && <DeleteNoteAction createdAt={createdAt} />}
      </ActionPanel.Section>
      <ActionPanel.Section>
        <ActionPanel.Submenu
          title="Filter Tag"
          icon={{
            source: Icon.Filter,
            tintColor: colors.find((c) => c.name === "turquoise")?.tintColor,
          }}
          shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
        >
          {allTags &&
            allTags.length > 0 &&
            allTags.map((tag, i) => (
              <Action
                key={i}
                icon={{
                  source: "dot.png",
                  tintColor: colors.find((c) => c.name === tag.color)?.tintColor ?? "blue",
                }}
                title={tag.name}
                onAction={() => {
                  onTagFilter(tag.name);
                }}
              />
            ))}
          <Action.Push title="Create" icon={Icon.Plus} target={<CreateTag />} />
        </ActionPanel.Submenu>
        <Action.Push
          title="New Tag"
          icon={{
            source: Icon.Tag,
            tintColor: colors.find((c) => c.name === "turquoise")?.tintColor,
          }}
          target={<CreateTag />}
          shortcut={{ modifiers: ["cmd"], key: "t" }}
        />
        <Action.Push
          title="Delete Tags"
          icon={{
            source: Icon.Trash,
            tintColor: colors.find((c) => c.name === "red")?.tintColor,
          }}
          target={<DeleteTags />}
          shortcut={{ modifiers: ["ctrl", "shift"], key: "t" }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
};

export default Actions;
