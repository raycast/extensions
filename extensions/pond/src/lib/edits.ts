import { Alert, confirmAlert, Icon, showToast, Toast } from "@raycast/api";
import type { ApiSave } from "pond-api";
import { pond } from "../api/client";
import { toError } from "../api/problems";
import { failToast } from "../components/problem";
import { saveTitle } from "./display";

/** Matches `mutate` from both paginated and plain `useCachedPromise` lists of saves. */
export type SavesMutate = (
  update: Promise<{ changed: number }>,
  options: { optimisticUpdate: (data: ApiSave[] | undefined) => ApiSave[] },
) => Promise<{ changed: number }>;

interface Edit {
  save: ApiSave;
  busy: string;
  done: string;
  failed: string;
  request: () => Promise<{ changed: number }>;
  /** Returns the edited save, or `null` when it leaves the current list. */
  change: (save: ApiSave) => ApiSave | null;
}

export interface SaveEditor {
  toggleTag(save: ApiSave, tag: string): Promise<void>;
  addTags(save: ApiSave, tags: string[]): Promise<void>;
  toggleFolder(save: ApiSave, folder: { id: string; name: string }): Promise<void>;
  setNote(save: ApiSave, note: string): Promise<void>;
  setRating(save: ApiSave, rating: number): Promise<void>;
  trash(save: ApiSave): Promise<void>;
  restore(save: ApiSave): Promise<void>;
}

/** Edits show at once and roll back if Pond refuses them. */
export function saveEditor(mutate: SavesMutate, options: { inTrash?: boolean } = {}): SaveEditor {
  async function apply(edit: Edit) {
    const toast = await showToast({ style: Toast.Style.Animated, title: edit.busy, message: saveTitle(edit.save) });
    try {
      await mutate(edit.request(), {
        optimisticUpdate: (data) =>
          (data ?? []).flatMap((item) => (item.id === edit.save.id ? (edit.change(item) ?? []) : item)),
      });
      toast.style = Toast.Style.Success;
      toast.title = edit.done;
    } catch (error) {
      failToast(toast, toError(error), edit.failed);
    }
  }

  function editTags(save: ApiSave, add: string[], remove: string[]) {
    const removed = new Set(remove.map((tag) => tag.toLowerCase()));
    const kept = save.tags.filter((tag) => !removed.has(tag.toLowerCase()));
    const tags = [...kept, ...add.filter((tag) => !kept.some((item) => item.toLowerCase() === tag.toLowerCase()))];
    return apply({
      save,
      busy: "Updating Tags",
      done: remove.length && !add.length ? `Removed ${remove.join(", ")}` : `Tagged ${add.join(", ")}`,
      failed: "Couldn't update tags",
      request: () => pond().editTags({ ids: [save.id], add, remove, libraryId: save.libraryId }),
      change: (item) => ({ ...item, tags }),
    });
  }

  return {
    toggleTag(save, tag) {
      const has = save.tags.some((item) => item.toLowerCase() === tag.toLowerCase());
      return has ? editTags(save, [], [tag]) : editTags(save, [tag], []);
    },
    addTags(save, tags) {
      return editTags(save, tags, []);
    },
    toggleFolder(save, folder) {
      const has = save.folderIds.includes(folder.id);
      return apply({
        save,
        busy: has ? "Removing from Folder" : "Adding to Folder",
        done: has ? `Removed from ${folder.name}` : `Added to ${folder.name}`,
        failed: "Couldn't change folders",
        request: () =>
          pond().editFolders({
            ids: [save.id],
            add: has ? [] : [folder.id],
            remove: has ? [folder.id] : [],
            libraryId: save.libraryId,
          }),
        change: (item) => ({
          ...item,
          folderIds: has ? item.folderIds.filter((id) => id !== folder.id) : [...item.folderIds, folder.id],
        }),
      });
    },
    setNote(save, note) {
      const value = note.trim() || null;
      return apply({
        save,
        busy: "Saving Note",
        done: value ? "Saved Note" : "Removed Note",
        failed: "Couldn't save the note",
        request: () => pond().setNote(save.id, value, save.libraryId),
        change: (item) => ({ ...item, note: value }),
      });
    },
    setRating(save, rating) {
      return apply({
        save,
        busy: "Rating",
        done: rating ? `Rated ${rating} of 5` : "Cleared Rating",
        failed: "Couldn't change the rating",
        request: () => pond().setRating([save.id], rating, save.libraryId),
        change: (item) => ({ ...item, rating: rating || null }),
      });
    },
    async trash(save) {
      const confirmed = await confirmAlert({
        title: "Move to Trash?",
        message: `"${saveTitle(save)}" moves to the Trash. You can restore it from Pond or from the Trash filter here.`,
        icon: Icon.Trash,
        primaryAction: { title: "Move to Trash", style: Alert.ActionStyle.Destructive },
      });
      if (!confirmed) return;
      return apply({
        save,
        busy: "Moving to Trash",
        done: "Moved to Trash",
        failed: "Couldn't move the save to the Trash",
        request: () => pond().trash([save.id], save.libraryId),
        change: () => null,
      });
    },
    restore(save) {
      return apply({
        save,
        busy: "Restoring",
        done: "Restored",
        failed: "Couldn't restore the save",
        request: () => pond().restore([save.id], save.libraryId),
        change: (item) => (options.inTrash ? null : { ...item, deletedAt: null }),
      });
    },
  };
}
