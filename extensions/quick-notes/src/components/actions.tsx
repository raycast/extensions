import { ActionPanel, Action, Icon, Clipboard, showToast, Toast } from "@raycast/api";
import CreateEditNoteForm from "./createEditNoteForm";
import CreateTag from "./createTag";
import DeleteNoteAction from "./deleteNoteAction";
import { getSortHumanReadable, getTintColor } from "../utils/utils";
import { Sort, sortArr, tagsAtom } from "../services/atoms";
import { useAtom } from "jotai";
import DeleteTags from "./deleteTags";
import { useCachedState } from "@raycast/utils";

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
  const [, setMenu] = useCachedState("menu", false);
  const [sort, setSort] = useCachedState<Sort>("sort", "updated");

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {!noNotes && (
          <>
            <Action.Push
              title="Edit Note"
              icon={{
                source: Icon.Pencil,
                tintColor: getTintColor("sky"),
              }}
              target={
                <CreateEditNoteForm isDraft={isDraft} title={title} note={note} tags={tags} createdAt={createdAt} />
              }
            />
            <Action
              title="Copy Note"
              icon={{ source: Icon.CopyClipboard, tintColor: getTintColor("turquoise") }}
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
            tintColor: getTintColor("green"),
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
            tintColor: getTintColor("turquoise"),
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
                  tintColor: getTintColor(tag.color) ?? "blue",
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
            tintColor: getTintColor("turquoise"),
          }}
          target={<CreateTag />}
          shortcut={{ modifiers: ["cmd"], key: "t" }}
        />
        <Action.Push
          title="Delete Tags"
          icon={{
            source: Icon.Trash,
            tintColor: getTintColor("red"),
          }}
          target={<DeleteTags />}
          shortcut={{ modifiers: ["ctrl", "shift"], key: "t" }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title="Toggle Menu"
          icon={{
            source: Icon.AppWindowSidebarRight,
            tintColor: getTintColor("indigo"),
          }}
          onAction={() => setMenu((prev) => !prev)}
          shortcut={{ modifiers: ["cmd"], key: "m" }}
        />
        <ActionPanel.Submenu
          title="Sort"
          icon={{
            source: Icon.Filter,
            tintColor: getTintColor("indigo"),
          }}
          shortcut={{ modifiers: ["cmd"], key: "s" }}
        >
          {sortArr.map((s, i) => (
            <Action
              key={i}
              icon={
                s === sort
                  ? {
                      source: Icon.ArrowRightCircle,
                      tintColor: "teal",
                    }
                  : undefined
              }
              title={getSortHumanReadable(s)}
              onAction={() => setSort(s)}
            />
          ))}
        </ActionPanel.Submenu>
      </ActionPanel.Section>
    </ActionPanel>
  );
};

export default Actions;
