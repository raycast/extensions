import { categoryTitle } from "./model.ts";
import { randomUUID } from "node:crypto";
import * as fs from "node:fs/promises";
import path from "node:path";
import { Fragment, useCallback, useEffect, useState } from "react";
import {
  Action,
  ActionPanel,
  Alert,
  Detail,
  Form,
  Icon,
  Keyboard,
  List,
  Toast,
  confirmAlert,
  environment,
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
  useNavigation,
} from "@raycast/api";
import { aiConfigFromPreferences } from "./ai.ts";
import { failureMessage } from "./bookmark-form.tsx";
import {
  applyJsonImport,
  previewJsonImport,
  saveJsonExport,
} from "./import-export.ts";
import type { ImportDecisions, ImportPlan } from "./import-export.ts";
import { backfillMissingIcons } from "./icon-service.ts";
import SharedJsonForm from "./shared-json.tsx";
import {
  bookmarkMutation,
  catalogMutation,
  DEFAULT_LOCATION,
  entityKey,
  MAX_EVENT_BYTES,
  removeCategory,
  TRASH_LOCATION,
  validateBookmark,
} from "./model.ts";
import type {
  Bookmark,
  Candidate,
  Catalog,
  Conflict,
  EntityValue,
  LibraryState,
  Location,
  Mutation,
} from "./model.ts";
import {
  commit,
  configureDirectory,
  readLibrary,
  resolveConflicts,
} from "./repository.ts";

function isCatalog(value: EntityValue): value is Catalog {
  return (value as Catalog).groups !== undefined;
}

function locationLabel(catalog: Catalog, location: Location): string {
  const group = catalog.groups.find((g) => g.id === location.groupId);
  const sub = group?.children.find((s) => s.id === location.subGroupId);
  return `${group ? categoryTitle(group.id, group.name) : location.groupId} › ${sub ? categoryTitle(sub.id, sub.name) : location.subGroupId}`;
}

function memberCount(
  state: LibraryState,
  groupId: string,
  subGroupId?: string,
) {
  return state.bookmarks.filter((bookmark) =>
    bookmark.locations.some(
      (location) =>
        location.groupId === groupId &&
        (!subGroupId || location.subGroupId === subGroupId),
    ),
  ).length;
}

export default function Command({ onClose }: { onClose?: () => void } = {}) {
  const preferences = getPreferenceValues<Preferences>();
  const { push } = useNavigation();
  const [root, setRoot] = useState<string>();
  const [state, setState] = useState<LibraryState>();
  const [failure, setFailure] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);
  const [resolutions, setResolutions] = useState<
    Record<string, { eventId: string; mutation: Mutation }>
  >({});

  useEffect(() => () => onClose?.(), [onClose]);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const directory = await configureDirectory(
        preferences.dataDirectory,
        environment.supportPath,
      );
      const library = await readLibrary(directory);
      setRoot(directory);
      setState(library);
      setResolutions({});
      setFailure(undefined);
    } catch (error) {
      setFailure(failureMessage(error));
    }
    setIsLoading(false);
  }, [preferences.dataDirectory]);

  useEffect(() => {
    void load();
  }, [load]);

  async function deleteCategory(
    groupId: string,
    subGroupId: string | undefined,
    target: "default" | "trash",
  ) {
    if (!root || !state) return;
    let mutations: Mutation[];
    let affectedCount: number;
    try {
      ({ mutations, affectedCount } = removeCategory(
        state,
        groupId,
        subGroupId,
        target,
      ));
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Cannot delete category",
        message: failureMessage(error),
      });
      return;
    }
    const confirmed = await confirmAlert({
      title: `Delete${subGroupId ? "subcategory" : "top-level category"}?`,
      message: `The affected ${affectedCount} bookmarks will be ${target === "trash" ? "Move to Trash" : "moved to the default location"}; the category and bookmarks are saved in one transaction.`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    try {
      const result = await commit(root, {
        mutations,
        expectedHeads: state.heads,
      });
      setState(result.state);
      await showToast({
        style: Toast.Style.Success,
        title: "Category deleted",
        message: result.warning ?? `Affected bookmarks: ${affectedCount} items`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Not saved",
        message: failureMessage(error),
      });
    }
  }

  async function applyResolutions() {
    if (!root || !state) return;
    const chosen = Object.values(resolutions);
    if (chosen.length !== state.conflicts.length) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Some conflicts still need a version selected",
        message: `Selected ${chosen.length}/${state.conflicts.length}`,
      });
      return;
    }
    try {
      const result = await resolveConflicts(
        root,
        chosen.map((entry) => entry.mutation),
        state.heads,
      );
      setState(result.state);
      setResolutions({});
      await showToast({
        style: Toast.Style.Success,
        title: "Conflicts resolved",
        message: result.warning ?? `Committed ${chosen.length} versions`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Not saved",
        message: failureMessage(error),
      });
    }
  }

  const recoveryActions = (
    <ActionPanel>
      <Action
        title="Reload"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={load}
      />
      <Action
        title="Open Extension Preferences"
        icon={Icon.Gear}
        onAction={openExtensionPreferences}
      />
    </ActionPanel>
  );

  if (failure) {
    return (
      <Detail
        markdown={`# Cannot Read Local Library

${failure}

Ensure the data directory exists and is dedicated (empty or containing only \`events\`). Changing directories changes only local settings; it does not move or delete the old library.`}
        actions={recoveryActions}
      />
    );
  }

  if (!root || !state) {
    return (
      <List isLoading>
        <List.EmptyView title="Reading Local Library" />
      </List>
    );
  }

  if (state.status === "blocked") {
    const issues = state.issues
      .map(
        (issue) =>
          `- \`${issue.code}\` ${issue.message}${issue.file ? ` (${issue.file})` : ""}`,
      )
      .join("\n");
    return (
      <Detail
        markdown={`# Local Library Is Read-Only

Corrupt, missing-parent, unknown-version, or oversized data was found. The library will not be overwritten with an empty one, and unknown files will not be removed automatically.

${issues}

Data directory: \`${root}\``}
        actions={recoveryActions}
      />
    );
  }

  const ready = state.status === "ready";
  const conflicted = state.conflicts.length > 0;
  const ai = aiConfigFromPreferences(preferences);

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Settings & Data"
      searchBarPlaceholder="Search categories or features"
    >
      <List.Section title="Data Directory">
        <List.Item
          title={root}
          subtitle="Dedicated directory: local setting only; changing it does not move or delete the old library"
          icon={Icon.Folder}
          accessories={[
            {
              text: ready
                ? "Writable"
                : conflicted
                  ? "Read-only: conflicts"
                  : "Read-only",
            },
            { text: `Bookmarks: ${state.bookmarks.length}` },
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Open Extension Preferences (Change Data Directory)"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
              <Action
                title="Validate Custom Directory"
                icon={Icon.Checkmark}
                onAction={() => push(<DirectoryForm />)}
              />
              <Action.Push
                title="Connect Shared JSON Source…"
                icon={Icon.Link}
                target={
                  <SharedJsonForm
                    root={root}
                    state={state}
                    onSaved={setState}
                  />
                }
              />
              <Action.CopyToClipboard
                title="Copy Data Directory"
                content={root}
              />
              <Action
                title="Reload"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={load}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      {conflicted && (
        <List.Section
          title={`Unresolved Conflicts (${state.conflicts.length})`}
          subtitle="Normal writes are paused; only conflict resolution is allowed"
        >
          {state.conflicts.map((conflict) => {
            const chosen = resolutions[conflict.entityKey];
            return (
              <List.Item
                key={conflict.entityKey}
                title={conflictTitle(conflict)}
                subtitle={conflict.message}
                icon={Icon.Warning}
                accessories={[
                  { tag: `${conflict.candidates.length} versions` },
                  {
                    text: chosen
                      ? `Selected ${chosen.eventId.slice(0, 8)}`
                      : "Not selected",
                  },
                ]}
                actions={
                  <ActionPanel>
                    <Action
                      title="View Versions and Select"
                      icon={Icon.List}
                      onAction={() =>
                        push(
                          <ConflictView
                            state={state}
                            conflict={conflict}
                            onChoose={(choice) =>
                              setResolutions((previous) => ({
                                ...previous,
                                [conflict.entityKey]: choice,
                              }))
                            }
                          />,
                        )
                      }
                    />
                  </ActionPanel>
                }
              />
            );
          })}
          <List.Item
            title="Apply All Conflict Resolutions"
            subtitle={`Selected ${Object.keys(resolutions).length}/${state.conflicts.length}; all conflicts must be resolved together`}
            icon={Icon.Checkmark}
            actions={
              <ActionPanel>
                <Action
                  title="Apply All Conflict Resolutions"
                  icon={Icon.Checkmark}
                  onAction={applyResolutions}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {ready && (
        <List.Section title="Categories">
          <List.Item
            title="New Top-Level Category"
            icon={Icon.Plus}
            actions={
              <ActionPanel>
                <Action
                  title="New Top-Level Category"
                  icon={Icon.Plus}
                  onAction={() =>
                    push(
                      <CategoryForm
                        root={root}
                        state={state}
                        mode="create-group"
                        onSaved={setState}
                      />,
                    )
                  }
                />
              </ActionPanel>
            }
          />
          {state.catalog.groups.map((group) => {
            const fixed =
              group.id === DEFAULT_LOCATION.groupId ||
              group.id === TRASH_LOCATION.groupId;
            return (
              <Fragment key={group.id}>
                <List.Item
                  title={categoryTitle(group.id, group.name)}
                  subtitle={`Top-level category · Bookmarks: ${memberCount(state, group.id)}`}
                  icon={Icon.Folder}
                  actions={
                    <ActionPanel>
                      <Action
                        title="New Subcategory"
                        icon={Icon.Plus}
                        onAction={() =>
                          push(
                            <CategoryForm
                              root={root}
                              state={state}
                              mode="create-sub"
                              groupId={group.id}
                              onSaved={setState}
                            />,
                          )
                        }
                      />
                      <Action
                        title="Rename"
                        icon={Icon.Pencil}
                        shortcut={Keyboard.Shortcut.Common.Edit}
                        onAction={() =>
                          push(
                            <CategoryForm
                              root={root}
                              state={state}
                              mode="rename-group"
                              groupId={group.id}
                              onSaved={setState}
                            />,
                          )
                        }
                      />
                      {!fixed && (
                        <>
                          <Action
                            title="Delete (Move Bookmarks to Default)"
                            icon={Icon.Trash}
                            style={Action.Style.Destructive}
                            onAction={() =>
                              void deleteCategory(
                                group.id,
                                undefined,
                                "default",
                              )
                            }
                          />
                          <Action
                            title="Delete (Move Bookmarks to Trash)"
                            icon={Icon.Trash}
                            style={Action.Style.Destructive}
                            shortcut={Keyboard.Shortcut.Common.Remove}
                            onAction={() =>
                              void deleteCategory(group.id, undefined, "trash")
                            }
                          />
                        </>
                      )}
                    </ActionPanel>
                  }
                />
                {group.children.map((sub) => (
                  <List.Item
                    key={sub.id}
                    title={`↳ ${categoryTitle(sub.id, sub.name)}`}
                    subtitle={`Subcategory · Bookmarks: ${memberCount(state, group.id, sub.id)}`}
                    accessories={[{ tag: categoryTitle(group.id, group.name) }]}
                    actions={
                      <ActionPanel>
                        <Action
                          title="Rename"
                          icon={Icon.Pencil}
                          shortcut={Keyboard.Shortcut.Common.Edit}
                          onAction={() =>
                            push(
                              <CategoryForm
                                root={root}
                                state={state}
                                mode="rename-sub"
                                groupId={group.id}
                                subGroupId={sub.id}
                                onSaved={setState}
                              />,
                            )
                          }
                        />
                        {!fixed && (
                          <>
                            <Action
                              title="Delete (Move Bookmarks to Default)"
                              icon={Icon.Trash}
                              style={Action.Style.Destructive}
                              onAction={() =>
                                void deleteCategory(group.id, sub.id, "default")
                              }
                            />
                            <Action
                              title="Delete (Move Bookmarks to Trash)"
                              icon={Icon.Trash}
                              style={Action.Style.Destructive}
                              shortcut={Keyboard.Shortcut.Common.Remove}
                              onAction={() =>
                                void deleteCategory(group.id, sub.id, "trash")
                              }
                            />
                          </>
                        )}
                      </ActionPanel>
                    }
                  />
                ))}
              </Fragment>
            );
          })}
        </List.Section>
      )}

      {ready && (
        <List.Section title="Icons">
          <List.Item
            title="Fill Missing Icons"
            subtitle="Fetch favicons for bookmarks with missing or placeholder icons and save to icons/"
            icon={Icon.Image}
            accessories={[
              {
                text: `${state.bookmarks.filter((b) => !b.isDeleted && (!b.icon || b.icon.type === "text")).length} pending`,
              },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Fill Missing Icons"
                  icon={Icon.Image}
                  onAction={() =>
                    void (async () => {
                      const toast = await showToast({
                        style: Toast.Style.Animated,
                        title: "Filling missing icons",
                      });
                      try {
                        const map = await backfillMissingIcons(
                          root,
                          state.bookmarks,
                        );
                        if (!map.size) {
                          toast.style = Toast.Style.Success;
                          toast.title = "No icons need filling";
                          return;
                        }
                        const mutations = state.bookmarks
                          .filter((b) => map.has(b.id))
                          .map((b) =>
                            bookmarkMutation(state, {
                              ...b,
                              icon: map.get(b.id),
                              iconMatchedAt: Date.now(),
                              updatedAt: Date.now(),
                            }),
                          );
                        // Commit in chunks if many — single transaction for simplicity
                        const result = await commit(root, {
                          mutations,
                          expectedHeads: state.heads,
                        });
                        setState(result.state);
                        toast.style = Toast.Style.Success;
                        toast.title = `Filled ${map.size} icons`;
                        toast.message = result.warning;
                      } catch (error) {
                        toast.style = Toast.Style.Failure;
                        toast.title = "Failed to fill icons";
                        toast.message = failureMessage(error);
                      }
                    })()
                  }
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {ready && (
        <List.Section title="Import & Export">
          <List.Item
            title="Import JSON"
            subtitle="Preview counts and warnings, choose each same-ID difference, then write in one transaction"
            icon={Icon.Download}
            actions={
              <ActionPanel>
                <Action
                  title="Import JSON"
                  icon={Icon.Download}
                  onAction={() =>
                    push(
                      <ImportFileForm
                        root={root}
                        state={state}
                        onSaved={setState}
                      />,
                    )
                  }
                />
              </ActionPanel>
            }
          />
          <List.Item
            title="Export JSON"
            subtitle="Save in a directory you choose; existing files and the data directory are never overwritten"
            icon={Icon.Upload}
            actions={
              <ActionPanel>
                <Action
                  title="Export JSON"
                  icon={Icon.Upload}
                  onAction={() => push(<ExportForm root={root} />)}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      <List.Section title="AI (optional BYOK)">
        <List.Item
          title={`Protocol: ${ai.protocol}`}
          subtitle={`Service: ${ai.baseUrl || "Not configured"} · Model: ${ai.model || "Not configured"}`}
          icon={Icon.Stars}
          accessories={[
            {
              text: ai.apiKey
                ? "Key configured for this protocol"
                : "Key missing for this protocol",
            },
            { text: "Requests are sent only when you initiate them" },
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Open Extension Preferences"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

function conflictTitle(conflict: Conflict): string {
  const value = conflict.candidates[0]?.value;
  if (value && !isCatalog(value))
    return value.title || `Bookmarks: ${value.id}`;
  return "Category Table (Catalog)";
}

type CategoryMode =
  "create-group" | "create-sub" | "rename-group" | "rename-sub";

function CategoryForm({
  root,
  state,
  mode,
  groupId,
  subGroupId,
  onSaved,
}: {
  root: string;
  state: LibraryState;
  mode: CategoryMode;
  groupId?: string;
  subGroupId?: string;
  onSaved: (state: LibraryState) => void;
}) {
  const { pop } = useNavigation();
  const group = state.catalog.groups.find((g) => g.id === groupId);
  const sub = group?.children.find((s) => s.id === subGroupId);
  const [name, setName] = useState(
    mode.startsWith("rename") ? (sub?.name ?? group?.name ?? "") : "",
  );

  async function save() {
    const nextName = name.trim();
    if (!nextName) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Enter a category name",
      });
      return;
    }
    const catalog = structuredClone(state.catalog);
    const now = Date.now();
    if (mode === "create-group") {
      // Matches the legacy shape: a group always carries its own default sub-group.
      catalog.groups.push({
        id: randomUUID(),
        name: nextName,
        createdAt: now,
        updatedAt: now,
        children: [
          {
            id: randomUUID(),
            name: "Uncategorized",
            createdAt: now,
            updatedAt: now,
          },
        ],
      });
    } else {
      const target = catalog.groups.find((g) => g.id === groupId);
      if (!target) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Category not found",
        });
        return;
      }
      if (mode === "create-sub") {
        target.children.push({
          id: randomUUID(),
          name: nextName,
          createdAt: now,
          updatedAt: now,
        });
      } else {
        const child =
          mode === "rename-sub"
            ? target.children.find((s) => s.id === subGroupId)
            : target;
        if (!child) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Category not found",
          });
          return;
        }
        child.name = nextName;
        child.updatedAt = now;
      }
    }
    try {
      const result = await commit(root, {
        mutations: [catalogMutation(state, catalog)],
        expectedHeads: state.heads,
      });
      onSaved(result.state);
      await showToast({
        style: Toast.Style.Success,
        title: "Category saved",
        message: result.warning ?? nextName,
      });
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Not saved",
        message: failureMessage(error),
      });
    }
  }

  const titles: Record<CategoryMode, string> = {
    "create-group": "New Top-Level Category",
    "create-sub": `Create a subcategory in ${group?.name ?? ""} `,
    "rename-group": "Rename Top-Level Category",
    "rename-sub": "Rename Subcategory",
  };

  return (
    <Form
      navigationTitle={titles[mode]}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save"
            icon={Icon.Checkmark}
            onSubmit={save}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        value={name}
        onChange={setName}
        autoFocus
      />
      <Form.Description
        title="Note"
        text="Category changes and bookmark moves are saved in one transaction; Default and Trash cannot be deleted."
      />
    </Form>
  );
}

function ConflictView({
  state,
  conflict,
  onChoose,
}: {
  state: LibraryState;
  conflict: Conflict;
  onChoose: (choice: { eventId: string; mutation: Mutation }) => void;
}) {
  const { pop } = useNavigation();
  const heads = [...(state.heads[conflict.entityKey] ?? [])].sort();

  function choose(candidate: Candidate, mode: "keep" | "trash" | "default") {
    if (isCatalog(candidate.value)) {
      onChoose({
        eventId: candidate.eventId,
        mutation: {
          entity: "catalog",
          entityId: candidate.value.id,
          baseHeads: heads,
          value: candidate.value,
        },
      });
      pop();
      return;
    }
    const bookmark = candidate.value;
    const value =
      mode === "keep"
        ? bookmark
        : validateBookmark({
            ...bookmark,
            isDeleted: mode === "trash",
            prevLocations:
              mode === "trash" ? bookmark.locations : bookmark.prevLocations,
            locations: mode === "trash" ? [TRASH_LOCATION] : [DEFAULT_LOCATION],
            updatedAt: Date.now(),
          });
    onChoose({
      eventId: candidate.eventId,
      mutation: {
        entity: "bookmark",
        entityId: bookmark.id,
        baseHeads: heads,
        value,
      },
    });
    pop();
  }

  return (
    <List navigationTitle="Choose Version to Keep">
      <List.Section
        title={`${conflict.candidates.length} concurrent versions`}
        subtitle="Select a version and return; all conflicts must be selected before applying"
      >
        {conflict.candidates.map((candidate) => {
          const value = candidate.value;
          const catalog = isCatalog(value);
          const bookmark = catalog ? undefined : (value as Bookmark);
          return (
            <List.Item
              key={candidate.eventId}
              title={
                catalog
                  ? `Category table: ${value.groups.length} top-level categories`
                  : bookmark!.title || `Bookmarks: ${bookmark!.id}`
              }
              subtitle={
                catalog
                  ? value.groups
                      .map((g) => categoryTitle(g.id, g.name))
                      .join(", ")
                  : [
                      bookmark!.url,
                      bookmark!.desc ?? "",
                      `Locations: ${bookmark!.locations.map((l) => locationLabel(state.catalog, l)).join(", ")}`,
                    ]
                      .filter(Boolean)
                      .join("\n")
              }
              icon={
                bookmark?.isDeleted
                  ? Icon.Trash
                  : catalog
                    ? Icon.Folder
                    : Icon.Bookmark
              }
              accessories={[
                { tag: `Version ${candidate.eventId.slice(0, 8)}` },
                ...(bookmark?.isDeleted
                  ? [{ tag: "Tombstone (deleted)" }]
                  : []),
                ...(bookmark?.visits !== undefined
                  ? [{ text: `Base: ${bookmark.visits} visits` }]
                  : []),
                ...(bookmark
                  ? [{ date: new Date(bookmark.updatedAt ?? 0) }]
                  : []),
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Select and Keep This Version"
                    icon={Icon.Checkmark}
                    onAction={() => choose(candidate, "keep")}
                  />
                  {bookmark && (
                    <>
                      <Action
                        title="Select and Move to Trash"
                        icon={Icon.Trash}
                        onAction={() => choose(candidate, "trash")}
                      />
                      <Action
                        title="Select and Repair to Default"
                        icon={Icon.ArrowCounterClockwise}
                        onAction={() => choose(candidate, "default")}
                      />
                    </>
                  )}
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

function ImportFileForm({
  root,
  state,
  onSaved,
}: {
  root: string;
  state: LibraryState;
  onSaved: (state: LibraryState) => void;
}) {
  const { push } = useNavigation();
  return (
    <Form
      navigationTitle="Import JSON"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Preview Import"
            icon={Icon.Download}
            onSubmit={async (values: Form.Values) => {
              const picked = (values.file as string[] | undefined)?.[0];
              if (!picked) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Select a JSON file",
                });
                return;
              }
              try {
                const stat = await fs.lstat(picked);
                if (!stat.isFile() || stat.isSymbolicLink())
                  throw new Error("Select a regular file");
                if (stat.size > MAX_EVENT_BYTES)
                  throw new Error("File exceeds the 10 MiB limit");
                const plan = previewJsonImport(
                  await fs.readFile(picked, "utf8"),
                  state,
                );
                push(
                  <ImportPreview root={root} plan={plan} onSaved={onSaved} />,
                );
              } catch (error) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Preview failed",
                  message: failureMessage(error),
                });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Accepted Formats"
        text={
          "JSON exported by this extension, or the {groups, bookmarks} format from goose-mark / older marks. Remote/cache base64 icons are decoded into icons/ as files; settings and API keys are rejected."
        }
      />
      <Form.FilePicker
        id="file"
        title="JSON File"
        canChooseDirectories={false}
        allowMultipleSelection={false}
      />
    </Form>
  );
}

function ImportPreview({
  root,
  plan,
  onSaved,
}: {
  root: string;
  plan: ImportPlan;
  onSaved: (state: LibraryState) => void;
}) {
  const { pop } = useNavigation();
  const [decisions, setDecisions] = useState<ImportDecisions>({});
  const remaining = plan.differences.filter(
    (difference) => !decisions[difference.entityKey],
  ).length;
  const effective = plan.mutations.filter(
    (mutation) =>
      decisions[entityKey(mutation.entity, mutation.entityId)] !== "local",
  );

  async function apply() {
    if (remaining) {
      await showToast({
        style: Toast.Style.Failure,
        title: `There are ${remaining} same-ID differences not selected`,
      });
      return;
    }
    if (!effective.length) {
      await showToast({
        style: Toast.Style.Success,
        title: "No changes",
        message: "Imported content matches local data; no event was written",
      });
      pop();
      return;
    }
    try {
      const result = await applyJsonImport(root, plan, decisions);
      onSaved(result.state);
      await showToast({
        style: Toast.Style.Success,
        title: "Import saved locally",
        message: result.warning ?? `Committed ${effective.length} entities`,
      });
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Not saved",
        message: failureMessage(error),
      });
    }
  }

  return (
    <List navigationTitle="Import Preview">
      <List.Section title="Statistics">
        <List.Item
          title={`Bookmarks: ${plan.counts.bookmarks} · Top-level categories: ${plan.counts.groups}`}
          subtitle={`Generated IDs: ${plan.counts.generatedIds} · Missing timestamps: ${plan.counts.missingTimes} · Identical to local: ${plan.counts.identical}`}
        />
        <List.Item
          title={`Attachment/icon fields: ${plan.counts.attachments}`}
          subtitle="Field values are preserved without reading, copying, or downloading attachments"
          icon={plan.counts.attachments ? Icon.Warning : Icon.Document}
        />
        <List.Item
          title={`Same URL with different IDs: ${plan.counts.sameUrl}`}
          subtitle="Notice only; no automatic merging or removal of multiple locations"
          icon={plan.counts.sameUrl ? Icon.Info : Icon.Document}
        />
      </List.Section>
      {plan.warnings.length > 0 && (
        <List.Section title="Warnings">
          {plan.warnings.map((warning) => (
            <List.Item key={warning} title={warning} icon={Icon.Warning} />
          ))}
        </List.Section>
      )}
      {plan.differences.length > 0 && (
        <List.Section
          title={`Same-ID Differences (${plan.differences.length})`}
          subtitle="Choose each difference; never overwrite silently"
        >
          {plan.differences.map((difference) => (
            <List.Item
              key={difference.entityKey}
              title={difference.entityKey}
              subtitle={
                isCatalog(difference.local)
                  ? `Local: ${(difference.local as Catalog).groups.length} top-level categories → after import: ${(difference.incoming as Catalog).groups.length} items`
                  : `Local “${(difference.local as Bookmark).title}” / Incoming “${(difference.incoming as Bookmark).title}”`
              }
              accessories={[
                { tag: decisions[difference.entityKey] ?? "Not selected" },
              ]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="View Full Difference and Select"
                    icon={Icon.Document}
                    target={
                      <ImportDifference
                        difference={difference}
                        onChoose={(choice) =>
                          setDecisions((previous) => ({
                            ...previous,
                            [difference.entityKey]: choice,
                          }))
                        }
                      />
                    }
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
      <List.Section title="Apply">
        <List.Item
          title="Apply Import"
          subtitle={`Entities to commit: ${effective.length} · Unselected differences: ${remaining}`}
          icon={Icon.Checkmark}
          actions={
            <ActionPanel>
              <Action
                title="Apply Import"
                icon={Icon.Checkmark}
                onAction={apply}
              />
              <Action title="Cancel" icon={Icon.XmarkCircle} onAction={pop} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

function ImportDifference({
  difference,
  onChoose,
}: {
  difference: ImportPlan["differences"][number];
  onChoose: (choice: "local" | "incoming") => void;
}) {
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle={`Import Difference: ${difference.entityKey}`}
      actions={
        <ActionPanel>
          <Action
            title="Keep Local Version"
            onAction={() => {
              onChoose("local");
              pop();
            }}
          />
          <Action
            title="Use Incoming Version"
            onAction={() => {
              onChoose("incoming");
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Note"
        text="Compare local and incoming values field by field (URL, deletion status, locations, description, tags, and full category structure). Return to the preview to apply; imported values do not overwrite visit counts."
      />
      {[
        ...new Set([
          ...Object.keys(difference.local),
          ...Object.keys(difference.incoming),
        ]),
      ].map((field) => {
        const local =
          JSON.stringify(Reflect.get(difference.local, field), null, 2) ??
          "(no field)";
        const incoming =
          JSON.stringify(Reflect.get(difference.incoming, field), null, 2) ??
          "(no field)";
        return (
          <Fragment key={field}>
            <Form.Separator />
            <Form.Description
              title={`${field}${local === incoming ? "(same)" : "(different)"}`}
              text={`Local:
${local}

Incoming:
${incoming}`}
            />
          </Fragment>
        );
      })}
    </Form>
  );
}

function ExportForm({ root }: { root: string }) {
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle="Export JSON"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Export"
            icon={Icon.Upload}
            onSubmit={async (values: Form.Values) => {
              const directory = (values.directory as string[] | undefined)?.[0];
              if (!directory) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Select an export directory",
                });
                return;
              }
              const destination = path.join(
                directory,
                `marks-export-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
              );
              try {
                await saveJsonExport(root, destination);
                await showToast({
                  style: Toast.Style.Success,
                  title: "Verified local data exported",
                  message: destination,
                });
                pop();
              } catch (error) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Not exported",
                  message: failureMessage(error),
                });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Note"
        text="Only verified, conflict-free data is exported; API settings, directory paths, and runtime preferences are excluded. Existing destination files are never overwritten."
      />
      <Form.FilePicker
        id="directory"
        title="Export Directory"
        canChooseDirectories
        canChooseFiles={false}
        allowMultipleSelection={false}
      />
    </Form>
  );
}

function DirectoryForm() {
  const { push } = useNavigation();
  return (
    <Form
      navigationTitle="Validate Custom Data Directory"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Validate"
            icon={Icon.Checkmark}
            onSubmit={async (values: Form.Values) => {
              const picked = (values.directory as string[] | undefined)?.[0];
              if (!picked) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Select an existing directory",
                });
                return;
              }
              try {
                const real = await fs.realpath(picked);
                if (!(await fs.lstat(real)).isDirectory())
                  throw new Error("Select a directory, not a file");
                const entries = await fs.readdir(real);
                const allowed = new Set(["events", "icons", ".DS_Store"]);
                if (entries.some((entry) => !allowed.has(entry)))
                  throw new Error(
                    `Directory must be empty or contain only events/icons; currently contains: ${entries.slice(0, 5).join(", ")}`,
                  );
                push(
                  <Detail
                    markdown={`# Directory Available

\`${real}\`

Enter this path in “Dedicated Data Directory” under extension preferences, then reload:

1. Command → Extension Preferences (the “Open Extension Preferences” action)
2. Paste the path and save
3. Return and reload

Changing directories only changes local settings; it does not move or delete the old library. iCloud Drive can be used, but sync delays, placeholders, and concurrent writes are not guaranteed by this extension.`}
                    actions={
                      <ActionPanel>
                        <Action.CopyToClipboard
                          title="Copy Path"
                          content={real}
                        />
                        <Action
                          title="Open Extension Preferences"
                          icon={Icon.Gear}
                          onAction={openExtensionPreferences}
                        />
                      </ActionPanel>
                    }
                  />,
                );
              } catch (error) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Directory Unavailable",
                  message: failureMessage(error),
                });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Validation Only"
        text="Only reads the selected directory for validation. No data is created, moved, or deleted, and preferences are not written for you (Raycast has no API for writing them)."
      />
      <Form.FilePicker
        id="directory"
        title="Directory"
        canChooseDirectories
        canChooseFiles={false}
        allowMultipleSelection={false}
      />
    </Form>
  );
}
