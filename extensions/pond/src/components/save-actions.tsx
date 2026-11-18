import { Action, ActionPanel, Clipboard, Color, Icon, Keyboard, showToast, Toast } from "@raycast/api";
import type { ApiSave, ApiTag } from "pond-api";
import type { ReactNode } from "react";
import { pond } from "../api/client";
import { toError } from "../api/problems";
import { type FolderPath, saveTitle, sourceName } from "../lib/display";
import type { SaveEditor } from "../lib/edits";
import { downloadFile } from "../lib/files";
import type { Filter } from "../lib/filters";
import { isWebUrl, markdownLink, saveLink } from "../lib/links";
import { recordOpened } from "../lib/recent";
import { failToast } from "./problem";
import { RelatedSaves } from "./related-saves";
import { NoteForm, TagsForm } from "./save-forms";

/** Big libraries have thousands of tags; the submenu filters, but rendering them all stalls the panel. */
const TAG_LIMIT = 300;

export interface SaveActionsProps {
  save: ApiSave;
  editor: SaveEditor;
  tags: readonly ApiTag[];
  folders: readonly FolderPath[];
  onRefresh: () => void;
  onFilter?: (filter: Filter) => void;
  onToggleDetail?: () => void;
  quickLook?: string;
  children?: ReactNode;
}

async function copyFile(save: ApiSave) {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Copying File" });
  try {
    const file = await downloadFile(save);
    await Clipboard.copy({ file: file.path });
    toast.style = Toast.Style.Success;
    toast.title = "Copied File";
    toast.message = file.name;
  } catch (error) {
    failToast(toast, toError(error), "Couldn't copy the file");
  }
}

async function copyText(save: ApiSave) {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Copying Text" });
  try {
    const text = await pond().text(save.id);
    const body = [text.description, text.caption, text.ocr, text.transcript, text.note]
      .map((part) => part.trim())
      .filter(Boolean)
      .join("\n\n");
    if (!body) throw new Error("Pond hasn't found any text in this save yet.");
    await Clipboard.copy(body);
    toast.style = Toast.Style.Success;
    toast.title = "Copied Text";
  } catch (error) {
    failToast(toast, toError(error), "Couldn't copy the text");
  }
}

function tagChoices(save: ApiSave, tags: readonly ApiTag[]): string[] {
  const names = new Set(save.tags.map((tag) => tag.toLowerCase()));
  const rest = [...tags]
    .filter((tag) => !names.has(tag.name.toLowerCase()))
    .sort((a, b) => Number(b.starred) - Number(a.starred) || b.count - a.count)
    .slice(0, TAG_LIMIT)
    .map((tag) => tag.name);
  return [...save.tags, ...rest];
}

export function SaveActions({
  save,
  editor,
  tags,
  folders,
  onRefresh,
  onFilter,
  onToggleDetail,
  quickLook,
  children,
}: SaveActionsProps) {
  const title = saveTitle(save);
  const pondUrl = saveLink(save);
  const web = isWebUrl(save.url);
  const has = new Set(save.tags.map((tag) => tag.toLowerCase()));
  const inTrash = save.deletedAt !== null;

  return (
    <ActionPanel title={title}>
      <ActionPanel.Section>
        <Action.Open
          title="Open in Pond"
          icon={Icon.AppWindow}
          target={pondUrl}
          onOpen={() => void recordOpened(save)}
        />
        {web && <Action.OpenInBrowser title="Open Original" url={save.url} onOpen={() => void recordOpened(save)} />}
        {quickLook && <Action.ToggleQuickLook shortcut={Keyboard.Shortcut.Common.ToggleQuickLook} />}
        <Action.Push
          title="Show Related Saves"
          icon={Icon.Stars}
          shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
          target={<RelatedSaves save={save} />}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Copy">
        {web && <Action.CopyToClipboard title="Copy URL" content={save.url} shortcut={Keyboard.Shortcut.Common.Copy} />}
        <Action.CopyToClipboard
          title="Copy Pond Link"
          content={pondUrl}
          shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
        />
        {web && (
          <Action.CopyToClipboard
            title="Copy Markdown Link"
            content={markdownLink(title, save.url)}
            shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
          />
        )}
        {save.media.files > 0 && (
          <Action
            title={save.kind === "image" ? "Copy Image" : "Copy File"}
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
            onAction={() => copyFile(save)}
          />
        )}
        {(save.text.caption || save.text.ocr || save.text.transcript || save.description) && (
          <Action
            title="Copy Text"
            icon={Icon.Text}
            shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
            onAction={() => copyText(save)}
          />
        )}
        {web && (
          <Action.Paste title="Paste URL" content={save.url} shortcut={{ modifiers: ["cmd", "shift"], key: "v" }} />
        )}
      </ActionPanel.Section>
      <ActionPanel.Section title="Edit">
        <ActionPanel.Submenu title="Tag" icon={Icon.Tag} shortcut={{ modifiers: ["cmd"], key: "t" }}>
          <Action.Push
            title="New Tags"
            icon={Icon.Plus}
            target={<TagsForm save={save} onSubmit={(names) => editor.addTags(save, names)} />}
          />
          {tagChoices(save, tags).map((tag) => (
            <Action
              key={tag}
              title={tag}
              icon={has.has(tag.toLowerCase()) ? { source: Icon.CheckCircle, tintColor: Color.Green } : Icon.Circle}
              onAction={() => editor.toggleTag(save, tag)}
            />
          ))}
        </ActionPanel.Submenu>
        {folders.length > 0 && (
          <ActionPanel.Submenu title="Add to Folder" icon={Icon.Folder} shortcut={{ modifiers: ["cmd"], key: "l" }}>
            {folders.map((folder) => (
              <Action
                key={folder.id}
                title={folder.path}
                icon={
                  save.folderIds.includes(folder.id)
                    ? { source: Icon.CheckCircle, tintColor: Color.Green }
                    : { source: Icon.Folder, tintColor: folder.color ?? undefined }
                }
                onAction={() => editor.toggleFolder(save, { id: folder.id, name: folder.name })}
              />
            ))}
          </ActionPanel.Submenu>
        )}
        <Action.Push
          title={save.note ? "Edit Note" : "Add Note"}
          icon={Icon.Pencil}
          shortcut={Keyboard.Shortcut.Common.Edit}
          target={<NoteForm save={save} onSubmit={(note) => editor.setNote(save, note)} />}
        />
        <ActionPanel.Submenu title="Rate" icon={Icon.Star}>
          {[5, 4, 3, 2, 1].map((stars) => (
            <Action
              key={stars}
              title={"★".repeat(stars)}
              icon={save.rating === stars ? { source: Icon.CheckCircle, tintColor: Color.Green } : Icon.Star}
              onAction={() => editor.setRating(save, stars)}
            />
          ))}
          {save.rating ? (
            <Action title="Clear Rating" icon={Icon.XMarkCircle} onAction={() => editor.setRating(save, 0)} />
          ) : null}
        </ActionPanel.Submenu>
        {inTrash ? (
          <Action
            title="Restore from Trash"
            icon={Icon.ArrowCounterClockwise}
            shortcut={{ modifiers: ["cmd", "shift"], key: "z" }}
            onAction={() => editor.restore(save)}
          />
        ) : (
          <Action
            title="Move to Trash"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={Keyboard.Shortcut.Common.Remove}
            onAction={() => editor.trash(save)}
          />
        )}
      </ActionPanel.Section>
      {onFilter && (
        <ActionPanel.Section title="Filter">
          <Action
            title={`Show ${sourceName(save.source)} Saves`}
            icon={Icon.Filter}
            onAction={() => onFilter({ kind: "source", source: save.source })}
          />
          {save.tags.length > 0 && (
            <ActionPanel.Submenu title="Show Saves Tagged" icon={Icon.Tag}>
              {save.tags.map((tag) => (
                <Action key={tag} title={tag} onAction={() => onFilter({ kind: "tag", name: tag })} />
              ))}
            </ActionPanel.Submenu>
          )}
        </ActionPanel.Section>
      )}
      <ActionPanel.Section>
        {children}
        {onToggleDetail && (
          <Action
            title="Toggle Details"
            icon={Icon.Sidebar}
            shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
            onAction={onToggleDetail}
          />
        )}
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={onRefresh}
        />
        <Action.CopyToClipboard title="Copy Save ID" icon={Icon.Hashtag} content={save.id} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
