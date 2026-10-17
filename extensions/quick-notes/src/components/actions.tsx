import {
  ActionPanel,
  Action,
  Icon,
  Clipboard,
  showToast,
  Toast,
  environment,
  open,
  openExtensionPreferences,
  AI,
  Keyboard,
  Color,
} from "@raycast/api";
import { preferences } from "../services/config";
import CreateEditNoteForm from "./createEditNoteForm";
import CreateEditTagForm from "./createEditTagForm";
import DeleteAllNotesAction from "./deleteAllNotesAction";
import DeleteNoteAction from "./deleteNoteAction";
import { clearNoteSummary, getTintColor, setNoteSummary } from "../utils/utils";
import { notesAtom, Sort, sortOptions, tagsAtom } from "../services/atoms";
import { useAtom } from "jotai";
import { useCachedState } from "@raycast/utils";
import { useResetAtom } from "jotai/utils";
import slugify from "slugify";
import path from "node:path";
import fs from "node:fs";

const Actions = ({
  noNotes,
  onApplyTag,
  isDraft = false,
  title,
  icon,
  note,
  tags,
  createdAt,
}: {
  noNotes: boolean;
  onTagFilter: (tag: string) => void;
  onApplyTag: (tag: string, noteBody?: string) => void;
  isDraft?: boolean;
  title?: string;
  icon?: string;
  note?: string;
  tags?: string[];
  createdAt?: Date;
}) => {
  const [allTags] = useAtom(tagsAtom);
  const [, setMenu] = useCachedState("menu", false);
  const [sort, setSort] = useCachedState<Sort>("sort", "updated");

  const resetNotes = useResetAtom(notesAtom);

  if (noNotes) {
    return (
      <ActionPanel>
        <Action.Push
          title="New Note"
          icon={{ source: Icon.PlusSquare, tintColor: getTintColor("green") }}
          target={<CreateEditNoteForm isDraft={true} />}
          shortcut={Keyboard.Shortcut.Common.New}
        />
      </ActionPanel>
    );
  }

  const askAI = async () => {
    const toast = await showToast({
      title: "Generating AI summary…",
      message: "Please wait",
      style: Toast.Style.Animated,
    });

    try {
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

      toast.title = "AI summary generated";
      toast.message = "";
      toast.style = Toast.Style.Success;
    } catch {
      toast.title = "Failed to generate AI summary";
      toast.message = "Please try again";
      toast.style = Toast.Style.Failure;
    }
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
                <CreateEditNoteForm
                  isDraft={isDraft}
                  title={title}
                  icon={icon}
                  note={note}
                  tags={tags}
                  createdAt={createdAt}
                />
              }
              shortcut={Keyboard.Shortcut.Common.Edit}
            />
            <Action
              title="Copy Note"
              icon={{ source: Icon.CopyClipboard, tintColor: getTintColor("turquoise") }}
              shortcut={Keyboard.Shortcut.Common.Copy}
              onAction={() => {
                Clipboard.copy(note ?? "").then(() => {
                  showToast({ style: Toast.Style.Success, title: "Note Copied" });
                });
              }}
            />
            <Action
              title="Open Note Externally"
              icon={{ source: Icon.Folder, tintColor: getTintColor("turquoise") }}
              shortcut={Keyboard.Shortcut.Common.Open}
              onAction={async () => {
                const openPreferencesAction = {
                  title: "Open Extension Settings",
                  onAction: () => openExtensionPreferences(),
                };
                if (!preferences.fileLocation) {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "No Auto Save Location Set",
                    message: "Set a folder in the extension settings",
                    primaryAction: openPreferencesAction,
                  });
                  return;
                }
                if (!fs.existsSync(preferences.fileLocation)) {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "Auto Save Location Not Found",
                    message: "The folder no longer exists — update it in the extension settings",
                    primaryAction: openPreferencesAction,
                  });
                  return;
                }
                const notePath = path.join(preferences.fileLocation, `${slugify(`${title}`)}.md`);
                if (!fs.existsSync(notePath)) {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "Note File Not Found",
                    message: "Save the note or run Sync with Folder to export it first",
                  });
                  return;
                }
                try {
                  await open(notePath);
                } catch {
                  await showToast({ style: Toast.Style.Failure, title: "Failed to Open Note", message: notePath });
                }
              }}
            />
          </>
        )}
        <Action.Push
          title="New Note"
          icon={{ source: Icon.PlusSquare, tintColor: getTintColor("green") }}
          target={<CreateEditNoteForm isDraft={true} />}
          shortcut={Keyboard.Shortcut.Common.New}
        />
        {!noNotes && <DeleteNoteAction createdAt={createdAt} />}
        {!noNotes && <DeleteAllNotesAction />}
      </ActionPanel.Section>
      {environment.canAccess(AI) && (
        <ActionPanel.Section>
          <Action
            title="Summarize with AI"
            icon={{ source: Icon.SpeechBubbleActive, tintColor: getTintColor("sky") }}
            onAction={async () => await askAI()}
            shortcut={{
              macOS: { modifiers: ["cmd", "shift"], key: "a" },
              Windows: { modifiers: ["ctrl", "shift"], key: "a" },
            }}
          />
          <Action
            title="Clear AI Summary"
            icon={{ source: Icon.MinusCircle, tintColor: getTintColor("sky") }}
            onAction={() => {
              clearNoteSummary(createdAt);
              resetNotes();
            }}
            shortcut={{
              macOS: { modifiers: ["cmd", "opt"], key: "a" },
              Windows: { modifiers: ["ctrl", "alt"], key: "a" },
            }}
          />
        </ActionPanel.Section>
      )}
      <ActionPanel.Section>
        {allTags && allTags.length > 0 ? (
          <ActionPanel.Submenu
            title="Apply / Remove Tag"
            icon={{ source: Icon.Tag, tintColor: getTintColor("turquoise") }}
            shortcut={{
              macOS: { modifiers: ["cmd", "shift"], key: "t" },
              Windows: { modifiers: ["ctrl", "shift"], key: "t" },
            }}
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
          target={<CreateEditTagForm />}
          shortcut={{
            macOS: { modifiers: ["cmd", "shift"], key: "n" },
            Windows: { modifiers: ["ctrl", "shift"], key: "n" },
          }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title="Toggle Info Panel"
          icon={{ source: Icon.AppWindowSidebarRight, tintColor: getTintColor("indigo") }}
          onAction={() => setMenu((prev) => !prev)}
          shortcut={{
            macOS: { modifiers: ["cmd"], key: "i" },
            Windows: { modifiers: ["ctrl"], key: "i" },
          }}
        />
        <ActionPanel.Submenu
          title="Sort"
          icon={{ source: Icon.Filter, tintColor: getTintColor("indigo") }}
          shortcut={Keyboard.Shortcut.Common.Save}
        >
          {(Object.keys(sortOptions) as Sort[]).map((key) => {
            const option = sortOptions[key];
            return (
              <Action
                key={key}
                icon={{ source: option.icon, tintColor: key === sort ? Color.Green : undefined }}
                title={option.title}
                onAction={() => setSort(key)}
              />
            );
          })}
        </ActionPanel.Submenu>
      </ActionPanel.Section>
    </ActionPanel>
  );
};

export default Actions;
