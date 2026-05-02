import { Action, ActionPanel, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import type { ItemEditProps } from "./types";
import {
  getItemLocked,
  renameItem,
  setItemComment,
  setItemLocked,
  setItemStationery,
  useFinderTags,
  replaceItemTags,
} from "$lib/ray-fb";
import { convertDate, formatFileSize } from "$lib/utils";
import { ItemDetail } from "../item-detail";
import type { FinderTag } from "$lib/types";
import { DestinationSubmenu } from "$lib/components/shared/destination-submenu";
import { buildFinderTagView } from "$lib/pages/tag-browser/finder-tags";
import { buildAppliedUserTags, buildEditableTagCatalog } from "./tag-state";

export function ItemEdit({
  entry,
  directoryTarget,
  symlinkDirectoryTarget,
  siblingDirectories = [],
  onApplied,
  onCreateFolder,
  onCopyItem,
  onMoveItem,
}: ItemEditProps) {
  const { pop } = useNavigation();
  const [name, setName] = useState(entry.name);
  const [comment, setComment] = useState(entry.finderComment ?? "");
  const [initialLocked, setInitialLocked] = useState<boolean | null>(null);
  const [locked, setLockedState] = useState<boolean | null>(null);
  const [stationery, setStationery] = useState<boolean>(false);
  const [tags, setTags] = useState<string[]>(entry.userTags.map((tag) => tag.name));

  const { data: envTags, isLoading: tagsLoading, error: tagsError, revalidate: revalidateTags } = useFinderTags();

  const editableCatalog = useMemo<FinderTag[]>(
    () => buildEditableTagCatalog(entry.userTags, envTags ?? []),
    [entry.userTags, envTags],
  );

  useEffect(() => {
    const abort = new AbortController();
    setInitialLocked(null);
    setLockedState(null);

    (async () => {
      try {
        const { value: currentLocked } = await getItemLocked({ path: entry.path });
        if (abort.signal.aborted) return;
        setInitialLocked(currentLocked);
        setLockedState(currentLocked);
      } catch (error) {
        console.warn("Failed to read locked flag", error);
        if (abort.signal.aborted) return;
        setInitialLocked(false);
        setLockedState(false);
      }
    })();

    return () => {
      abort.abort();
    };
  }, [entry.path]);

  async function applyChanges(params: {
    desiredName: string;
    desiredComment: string;
    desiredLocked: boolean;
    desiredStationery: boolean;
    desiredTags: string[];
  }): Promise<string> {
    let currentPath = entry.path;

    if (params.desiredName !== entry.name) {
      const result = await renameItem({ path: entry.path, name: params.desiredName });
      currentPath = result.path;
    }

    const parallelTasks: Promise<void>[] = [];

    if ((entry.finderComment ?? "") !== params.desiredComment) {
      parallelTasks.push(setItemComment({ path: currentPath, value: params.desiredComment }));
    }

    if (initialLocked != null && params.desiredLocked !== initialLocked) {
      parallelTasks.push(
        (async () => {
          await setItemLocked({ path: currentPath, value: params.desiredLocked });
          setInitialLocked(params.desiredLocked);
          setLockedState(params.desiredLocked);
        })(),
      );
    }

    if (params.desiredStationery !== stationery) {
      parallelTasks.push(
        (async () => {
          await setItemStationery({ path: currentPath, value: params.desiredStationery });
          setStationery(params.desiredStationery);
        })(),
      );
    }

    const initialTags = entry.userTags.map((tag) => tag.name);
    const tagsChanged =
      params.desiredTags.length !== initialTags.length || params.desiredTags.some((t, i) => t !== initialTags[i]);
    if (tagsChanged) {
      parallelTasks.push(replaceItemTags({ path: currentPath, values: params.desiredTags }));
    }

    if (parallelTasks.length > 0) {
      const results = await Promise.allSettled(parallelTasks);
      const rejected = results.find((result) => result.status === "rejected") as PromiseRejectedResult | undefined;
      if (rejected) {
        throw rejected.reason;
      }
    }

    return currentPath;
  }

  async function onSubmit(values: { name?: string; comment?: string; locked?: boolean; stationery?: boolean }) {
    const desiredName = (values.name ?? name ?? "").trim();
    const desiredComment = values.comment ?? comment ?? "";
    const desiredLocked = values.locked ?? locked ?? initialLocked ?? false;
    const desiredStationery = values.stationery ?? stationery ?? false;

    if (!desiredName) {
      await showToast({ style: Toast.Style.Failure, title: "Name is required" });
      return;
    }
    if (desiredName.includes("/")) {
      await showToast({ style: Toast.Style.Failure, title: "Invalid name", message: "Name cannot contain '/'." });
      return;
    }
    if (desiredName === "." || desiredName === "..") {
      await showToast({ style: Toast.Style.Failure, title: "Invalid name", message: "Name cannot be '.' or '..'." });
      return;
    }
    if (desiredName.includes(":")) {
      await showToast({ style: Toast.Style.Failure, title: "Invalid name", message: "Name cannot contain ':'." });
      return;
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: "Applying changes…" });
    try {
      const currentPath = await applyChanges({
        desiredName,
        desiredComment,
        desiredLocked,
        desiredStationery,
        desiredTags: tags,
      });

      toast.style = Toast.Style.Success;
      toast.title = "Updated";
      if (onApplied) {
        const previousPath = entry.path;
        const userTags: FinderTag[] = buildAppliedUserTags(tags, editableCatalog);
        onApplied({
          path: currentPath,
          previousPath,
          name: desiredName,
          finderComment: desiredComment,
          userTags,
        });
      }
      pop();
    } catch (e: unknown) {
      const error = e as { message?: string; stderr?: string } | undefined;
      toast.style = Toast.Style.Failure;
      toast.title = error?.message ?? "Failed to apply changes";
      toast.message = error?.stderr;
    }
  }

  return (
    <Form
      navigationTitle={entry.name}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" onSubmit={onSubmit} icon={Icon.SaveDocument} />
          <Action
            title="Refresh Tags"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={revalidateTags}
          />
          <Action.Push
            title="Show Info"
            icon={Icon.Info}
            shortcut={{ modifiers: ["cmd"], key: "i" }}
            target={
              <ItemDetail
                entry={entry}
                tagCatalog={editableCatalog}
                directoryTarget={directoryTarget}
                symlinkDirectoryTarget={symlinkDirectoryTarget}
              />
            }
          />
          {onCreateFolder && (
            <Action.Push
              title="New Folder"
              icon={Icon.Folder}
              shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
              target={
                <Form
                  actions={
                    <ActionPanel>
                      <Action.SubmitForm
                        title="Create"
                        onSubmit={async (values: { name: string }) => {
                          const name = (values.name ?? "").trim();
                          if (name) {
                            await onCreateFolder(name);
                          }
                        }}
                      />
                    </ActionPanel>
                  }
                >
                  <Form.TextField id="name" title="Folder Name" placeholder="Enter folder name" />
                </Form>
              }
            />
          )}
          {onCopyItem && (
            <DestinationSubmenu
              mode="copy"
              title="Copy to…"
              sourcePath={entry.path}
              sourceType={entry.type}
              siblingDirectories={siblingDirectories}
              onSelect={onCopyItem}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          )}
          {onMoveItem && (
            <DestinationSubmenu
              mode="move"
              title="Move to…"
              sourcePath={entry.path}
              sourceType={entry.type}
              siblingDirectories={siblingDirectories}
              onSelect={onMoveItem}
              shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="File or folder name" value={name} onChange={setName} />
      <Form.Description title="Kind" text={entry.kind} />
      <Form.Description title="Path" text={entry.path} />

      <Form.Separator />

      <Form.TagPicker id="tags" title="Tags" value={tags} onChange={setTags}>
        {editableCatalog.map((tag) => {
          const tagView = buildFinderTagView(tag);
          return (
            <Form.TagPicker.Item
              key={tag.name}
              value={tag.name}
              title={tag.name}
              icon={{ source: Icon.CircleFilled, tintColor: tagView.color }}
            />
          );
        })}
      </Form.TagPicker>
      {tagsLoading && editableCatalog.length === 0 && <Form.Description title="" text="Loading tag catalog…" />}
      {!tagsLoading && !tagsError && editableCatalog.length === 0 && (
        <Form.Description title="" text="No tags found in this environment." />
      )}
      {tagsError != null && (
        <Form.Description title="" text="Could not load environment tags — item tags are still available." />
      )}
      <Form.Checkbox
        id="stationery"
        title="Stationery"
        label="Open as template (creates a copy when opened)"
        value={stationery}
        onChange={setStationery}
      />
      <Form.Checkbox
        id="locked"
        title="Locked"
        label="Prevent renaming, moving, or deleting in Finder"
        value={locked ?? false}
        onChange={setLockedState}
      />

      <Form.Separator />

      <Form.Description title="Size" text={formatFileSize(entry.size) ?? "0 B"} />
      <Form.Description title="Created" text={convertDate(entry.fsCreationDate).toLocaleString()} />
      <Form.Description title="Modified" text={convertDate(entry.contentModificationDate).toLocaleString()} />
      {entry.lastUsedDate != null && (
        <Form.Description title="Last Used" text={convertDate(entry.lastUsedDate).toLocaleString()} />
      )}

      <Form.Separator />

      <Form.TextArea
        id="comment"
        title="Finder Comment"
        placeholder="Add a Finder comment"
        value={comment}
        onChange={setComment}
      />
    </Form>
  );
}
