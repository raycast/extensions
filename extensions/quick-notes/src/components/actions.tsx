import { ActionPanel, Action, Icon, Clipboard, showToast, Toast, environment, open, AI } from "@raycast/api";
import { preferences } from "../services/config";
import CreateEditNoteForm from "./createEditNoteForm";
import CreateTag from "./createTag";
import DeleteNoteAction from "./deleteNoteAction";
import { clearNoteSummary, getSortHumanReadable, getTintColor, setNoteSummary } from "../utils/utils";
import { notesAtom, Sort, sortArr, tagsAtom } from "../services/atoms";
import { useAtom } from "jotai";
import DeleteTags from "./deleteTags";
import { useCachedState } from "@raycast/utils";
import { useResetAtom } from "jotai/utils";
import slugify from "slugify";

const Actions = ({
  noNotes,
  onTagFilter,
  onApplyTag,
  isDraft = false,
  title,
  note,
  tags,
  createdAt,
}: {
  noNotes: boolean;
  onTagFilter: (tag: string) => void;
  onApplyTag: (tag: string, noteBody?: string) => void;
  isDraft?: boolean;
  title?: string;
  note?: string;
  tags?: string[];
  createdAt?: Date;
}) => {
  const [allTags] = useAtom(tagsAtom);
  const [, setMenu] = useCachedState("menu", false);
  const [sort, setSort] = useCachedState<Sort>("sort", "updated");

  const resetNotes = useResetAtom(notesAtom);

  const askAI = async () => {
    let allData = "";
    const answer = AI.ask(
      note
        ? `Summarize the note here: ${note}. Be concise and informative. Avoid any conversational tone and DO NOT include the original text in the summary. The output will be displayed at the top of the note. Do NOT put any headings or titles in the summary, including something like "summary:".`
        : "",
    );
    answer.on("data", async (data) => {
      allData += data;
      setNoteSummary(allData, createdAt);
      resetNotes();
    });

    await answer;

    await showToast({ title: "AI Summary Generated" });
  };

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {!noNotes && (
          <>
            <Action.Push
              title="Edit Note"
              icon={{ source: Icon.Pencil, tintColor: getTintColor("sky") }}
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
            <Action
              title="Open Note Externally"
              icon={{ source: Icon.Folder, tintColor: getTintColor("turquoise") }}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
              onAction={() => {
                open(`${preferences.fileLocation}/${slugify(`${title}`)}.md`);
              }}
            />
          </>
        )}
        <Action.Push
          title="New Note"
          icon={{ source: Icon.PlusSquare, tintColor: getTintColor("green") }}
          target={<CreateEditNoteForm isDraft={true} />}
          shortcut={{ modifiers: ["cmd"], key: "n" }}
        />
        {!noNotes && <DeleteNoteAction createdAt={createdAt} />}
      </ActionPanel.Section>
      {environment.canAccess(AI) && (
        <ActionPanel.Section>
          <Action
            title="Summarize with AI"
            icon={{ source: Icon.SpeechBubbleActive, tintColor: getTintColor("sky") }}
            onAction={async () => await askAI()}
            shortcut={{ modifiers: ["cmd"], key: "i" }}
          />
          <Action
            title="Clear AI Summary"
            icon={{ source: Icon.MinusCircle, tintColor: getTintColor("sky") }}
            onAction={() => {
              clearNoteSummary(createdAt);
              resetNotes();
            }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
          />
        </ActionPanel.Section>
      )}
      <ActionPanel.Section>
        {allTags && allTags.length > 0 ? (
          <ActionPanel.Submenu
            title="Apply / Remove Tag"
            icon={{ source: Icon.Tag, tintColor: getTintColor("turquoise") }}
            shortcut={{ modifiers: ["cmd"], key: "t" }}
          >
            {allTags.map((tag, i) => (
              <Action
                key={i}
                icon={{ source: "dot.png", tintColor: getTintColor(tag.color) ?? "blue" }}
                title={tag.name}
                onAction={() => {
                  onApplyTag(tag.name, note);
                }}
              />
            ))}
          </ActionPanel.Submenu>
        ) : undefined}
        <Action.Push
          title="New Tag"
          icon={{ source: Icon.PlusSquare, tintColor: getTintColor("turquoise") }}
          target={<CreateTag />}
          shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
        />
        <ActionPanel.Submenu
          title="Filter Tag"
          icon={{ source: Icon.Filter, tintColor: getTintColor("turquoise") }}
          shortcut={{ modifiers: ["cmd"], key: "f" }}
        >
          {allTags &&
            allTags.length > 0 &&
            allTags.map((tag, i) => (
              <Action
                key={i}
                icon={{ source: "dot.png", tintColor: getTintColor(tag.color) ?? "blue" }}
                title={tag.name}
                onAction={() => {
                  onTagFilter(tag.name);
                }}
              />
            ))}
          <Action
            title="All Notes"
            icon={{ source: Icon.BulletPoints, tintColor: getTintColor("turquoise") }}
            onAction={() => onTagFilter("")}
          />
          <Action.Push title="Create" icon={Icon.Plus} target={<CreateTag />} />
        </ActionPanel.Submenu>
        <Action.Push
          title="Delete Tags"
          icon={{ source: Icon.Trash, tintColor: getTintColor("red") }}
          target={<DeleteTags />}
          shortcut={{ modifiers: ["ctrl", "shift"], key: "t" }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title="Toggle Menu"
          icon={{ source: Icon.AppWindowSidebarRight, tintColor: getTintColor("indigo") }}
          onAction={() => setMenu((prev) => !prev)}
          shortcut={{ modifiers: ["cmd"], key: "m" }}
        />
        <ActionPanel.Submenu
          title="Sort"
          icon={{ source: Icon.Filter, tintColor: getTintColor("indigo") }}
          shortcut={{ modifiers: ["cmd"], key: "s" }}
        >
          {sortArr.map((s, i) => (
            <Action
              key={i}
              icon={s === sort ? { source: Icon.ArrowRightCircle, tintColor: "teal" } : undefined}
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
