import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Action,
  ActionPanel,
  Alert,
  Detail,
  Form,
  Grid,
  Icon,
  Keyboard,
  LocalStorage,
  Toast,
  confirmAlert,
  environment,
  getPreferenceValues,
  open,
  openExtensionPreferences,
  showToast,
  useNavigation,
} from "@raycast/api";
import { resolveLaunchUrl, templateFields } from "./bookmark-utils.ts";
import {
  BookmarkForm,
  failureMessage,
  locationOptions,
  locationValue,
  parseLocationValue,
} from "./bookmark-form.tsx";
import {
  bookmarkMutation,
  deleteBookmark,
  restoreBookmark,
  categoryTitle,
  TRASH_LOCATION,
} from "./model.ts";
import type { Bookmark, LibraryState, Mutation, Visit } from "./model.ts";
import { ensureIconForBookmark, iconImageSource } from "./icon-service.ts";
import { commit, configureDirectory, readLibrary } from "./repository.ts";
import { aiConfigFromPreferences, suggestMetadata } from "./ai.ts";
import ManageData from "./manage-data.tsx";
import { refreshSharedJson } from "./shared-json.tsx";
import { setSharedJsonStorage } from "./shared-json-storage.ts";

setSharedJsonStorage(LocalStorage);

function listIcon(bookmark: Bookmark) {
  const bound = iconImageSource(bookmark.icon);
  if (bound) return bound;
  return bookmark.pinned ? Icon.Star : Icon.Bookmark;
}

function hostOf(url: string): string {
  return url.replace(/^https?:\/\//i, "").split(/[/?#]/)[0] || url;
}

function looksLikeHttpUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!/^https?:\/\//i.test(trimmed)) return false;
  try {
    const u = new URL(trimmed);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function matches(bookmark: Bookmark, needle: string): boolean {
  const query = needle.trim().toLowerCase();
  if (!query) return true;
  return [
    bookmark.title,
    bookmark.url,
    bookmark.desc ?? "",
    ...bookmark.tags,
  ].some((value) => value.toLowerCase().includes(query));
}

function inScope(bookmark: Bookmark, scope: string): boolean {
  if (scope === "trash") return bookmark.isDeleted === true;
  if (bookmark.isDeleted === true) return false;
  if (scope === "favorites") return bookmark.pinned === true;
  if (scope === "all" || scope === "recent") return true;
  return bookmark.locations.some((l) => locationValue(l) === scope);
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const { push } = useNavigation();
  const [root, setRoot] = useState<string>();
  const [state, setState] = useState<LibraryState>();
  const [failure, setFailure] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);
  const [scope, setScope] = useState("all");
  const [query, setQuery] = useState("");
  const sharedError = useRef("");

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const directory = await configureDirectory(
        preferences.dataDirectory,
        environment.supportPath,
      );
      let library = await readLibrary(directory);
      setRoot(directory);
      setState(library);
      if (library.status === "ready")
        library = await refreshSharedJson(directory, library);
      setRoot(directory);
      setState(library);
      setFailure(undefined);
      sharedError.current = "";
      if (library.status === "conflicted")
        await showToast({
          style: Toast.Style.Failure,
          title: "Unresolved conflicts; read-only for now",
          message: "Resolve conflicts in Settings & Data before writing",
        });
    } catch (error) {
      setFailure(failureMessage(error));
    }
    setIsLoading(false);
  }, [preferences.dataDirectory]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!root || !state || state.status !== "ready") return;
    const timer = setInterval(() => {
      void (async () => {
        try {
          const current = await readLibrary(root);
          if (current.status !== "ready") return;
          const next = await refreshSharedJson(root, current);
          if (next !== current) setState(next);
          if (sharedError.current) {
            sharedError.current = "";
            setFailure(undefined);
          }
        } catch (error) {
          const message = failureMessage(error);
          if (sharedError.current !== message) {
            sharedError.current = message;
            setFailure(`Shared JSON sync paused: ${message}`);
          }
        }
      })();
    }, 1500);
    return () => clearInterval(timer);
  }, [root, state]);

  async function applyCommit(
    mutations: Mutation[],
    visits: Visit[] | undefined,
    title: string,
    message?: string,
  ) {
    if (!root || !state) return;
    try {
      const result = await commit(root, {
        mutations,
        visits,
        expectedHeads: state.heads,
      });
      setState(result.state);
      await showToast({
        style: Toast.Style.Success,
        title,
        message: result.warning ?? message,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Not saved",
        message: failureMessage(error),
      });
    }
  }

  async function openBookmark(
    bookmark: Bookmark,
    values?: Record<string, string>,
  ): Promise<boolean> {
    if (!root || !state) return false;
    let url: string;
    try {
      url = resolveLaunchUrl(bookmark.url, values);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Unable to open",
        message: failureMessage(error),
      });
      return false;
    }
    try {
      await open(url);
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Unable to open link",
        message: bookmark.title,
      });
      return false;
    }
    try {
      const result = await commit(root, {
        mutations: [],
        visits: [{ bookmarkId: bookmark.id, usedAt: Date.now() }],
        expectedHeads: state.heads,
      });
      setState(result.state);
      if (result.warning)
        await showToast({
          style: Toast.Style.Success,
          title: "Opened and recorded visit; attention needed",
          message: result.warning,
        });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Opened, but could not record visit",
        message: failureMessage(error),
      });
    }
    return true;
  }

  const visible = useMemo(() => {
    if (!state) return { items: [] as Bookmark[], fallback: false };
    const matched = state.bookmarks
      .filter((bookmark) => inScope(bookmark, scope))
      .filter((bookmark) => matches(bookmark, query));
    if (query.trim() && !matched.length && scope !== "trash") {
      const fallback = state.bookmarks.filter(
        (bookmark) =>
          inScope(bookmark, scope) && bookmark.allowUniversal === true,
      );
      if (fallback.length) return { items: fallback, fallback: true };
    }
    const sorted = [...matched].sort(
      (a, b) =>
        (b.lastUsed ?? 0) - (a.lastUsed ?? 0) || a.title.localeCompare(b.title),
    );
    return { items: sorted, fallback: false };
  }, [state, scope, query]);

  if (failure) {
    return (
      <Detail
        markdown={`# Cannot Read Local Library

${failure}

Ensure the data directory exists and is dedicated (empty or containing only \`events\`), or change it in extension preferences. Changing directories does not move or delete the old library.`}
        actions={
          <ActionPanel>
            <Action title="Reload" icon={Icon.ArrowClockwise} onAction={load} />
            <Action
              title="Open Extension Preferences"
              icon={Icon.Gear}
              onAction={openExtensionPreferences}
            />
            {root && state && (
              <Action.Push
                title="Settings & Data"
                icon={Icon.Gear}
                target={<ManageData onClose={load} />}
              />
            )}
          </ActionPanel>
        }
      />
    );
  }

  if (!root || !state) {
    return (
      <Grid isLoading searchText={query} onSearchTextChange={setQuery}>
        <Grid.EmptyView title="Reading Local Library" />
      </Grid>
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

Unreadable or unsafe data was detected. Local files will not be overwritten with an empty library, and unverified data will not be shown.

${issues}

Data directory: \`${root}\``}
        actions={
          <ActionPanel>
            <Action.Push
              title="Settings & Data"
              icon={Icon.Gear}
              target={<ManageData onClose={load} />}
            />
            <Action title="Reload" icon={Icon.ArrowClockwise} onAction={load} />
            <Action
              title="Open Extension Preferences"
              icon={Icon.Gear}
              onAction={openExtensionPreferences}
            />
          </ActionPanel>
        }
      />
    );
  }

  const libraryRoot = root;
  const libraryState = state;

  const conflicted = libraryState.status === "conflicted";

  function actionsFor(bookmark: Bookmark) {
    const fields = templateFields(bookmark.url);
    return (
      <ActionPanel>
        <Action
          title={fields.length ? "Fill Parameters and Open" : "Open"}
          icon={Icon.Globe}
          onAction={() => {
            if (fields.length)
              push(
                <TemplateForm
                  fields={fields}
                  bookmark={bookmark}
                  onSubmit={(values) => openBookmark(bookmark, values)}
                />,
              );
            else void openBookmark(bookmark);
          }}
        />
        <Action.CopyToClipboard
          title="Copy URL"
          content={bookmark.url}
          shortcut={Keyboard.Shortcut.Common.Copy}
        />
        {!conflicted && (
          <>
            <Action
              title="Add Bookmark"
              icon={Icon.Plus}
              shortcut={Keyboard.Shortcut.Common.New}
              onAction={() =>
                push(
                  <BookmarkForm
                    root={libraryRoot}
                    state={libraryState}
                    onSaved={(next) => setState(next)}
                  />,
                )
              }
            />
            <Action
              title="Edit"
              icon={Icon.Pencil}
              shortcut={Keyboard.Shortcut.Common.Edit}
              onAction={() =>
                push(
                  <BookmarkForm
                    root={libraryRoot}
                    state={libraryState}
                    bookmark={bookmark}
                    onSaved={(next) => setState(next)}
                  />,
                )
              }
            />
            {!bookmark.isDeleted && (
              <Action
                title="Manage Category Locations"
                icon={Icon.Tag}
                shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
                onAction={() =>
                  push(
                    <LocationsForm
                      root={libraryRoot}
                      state={libraryState}
                      bookmark={bookmark}
                      onSaved={setState}
                    />,
                  )
                }
              />
            )}
          </>
        )}
        {!conflicted && (
          <Action
            title={
              bookmark.pinned ? "Remove from Favorites" : "Add to Favorites"
            }
            icon={bookmark.pinned ? Icon.StarDisabled : Icon.Star}
            shortcut={Keyboard.Shortcut.Common.Pin}
            onAction={() =>
              void applyCommit(
                [
                  bookmarkMutation(libraryState, {
                    ...bookmark,
                    pinned: !bookmark.pinned,
                    updatedAt: Date.now(),
                  }),
                ],
                undefined,
                bookmark.pinned
                  ? "Removed from Favorites"
                  : "Added to Favorites",
                bookmark.title,
              )
            }
          />
        )}
        {!conflicted &&
          (bookmark.isDeleted ? (
            <Action
              title="Restore"
              icon={Icon.ArrowCounterClockwise}
              onAction={() =>
                void applyCommit(
                  [restoreBookmark(libraryState, bookmark)],
                  undefined,
                  "Restored",
                  bookmark.title,
                )
              }
            />
          ) : (
            <Action
              title="Move to Trash"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={Keyboard.Shortcut.Common.Remove}
              onAction={async () => {
                const confirmed = await confirmAlert({
                  title: "Move to Trash?",
                  message: `${bookmark.title} will be moved to Trash and can be restored later.`,
                  primaryAction: {
                    title: "Move to Trash",
                    style: Alert.ActionStyle.Destructive,
                  },
                });
                if (confirmed)
                  void applyCommit(
                    [deleteBookmark(libraryState, bookmark)],
                    undefined,
                    "Moved to Trash",
                    bookmark.title,
                  );
              }}
            />
          ))}
        {conflicted && (
          <Action.Push
            title="Resolve Conflicts…"
            icon={Icon.Warning}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            target={<ManageData onClose={load} />}
          />
        )}
        {!conflicted && (
          <Action
            title="Refresh Icon"
            icon={Icon.Image}
            shortcut={{ modifiers: ["cmd", "opt"], key: "i" }}
            onAction={() =>
              void (async () => {
                try {
                  const icon = await ensureIconForBookmark(
                    libraryRoot,
                    bookmark,
                    true,
                  );
                  await applyCommit(
                    [
                      bookmarkMutation(libraryState, {
                        ...bookmark,
                        icon,
                        iconMatchedAt: Date.now(),
                        updatedAt: Date.now(),
                      }),
                    ],
                    undefined,
                    "Icon refreshed",
                    bookmark.title,
                  );
                } catch (error) {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "Failed to refresh icon",
                    message: failureMessage(error),
                  });
                }
              })()
            }
          />
        )}

        <Action.Push
          title="Settings & Data"
          icon={Icon.Gear}
          target={<ManageData onClose={load} />}
        />
        <Action
          title="Open Extension Preferences"
          icon={Icon.Gear}
          shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
          onAction={openExtensionPreferences}
        />
      </ActionPanel>
    );
  }

  const items = visible.items.map((bookmark) => (
    <Grid.Item
      key={bookmark.id}
      id={bookmark.id}
      title={bookmark.title}
      subtitle={hostOf(bookmark.url)}
      content={listIcon(bookmark)}
      keywords={[bookmark.url, bookmark.desc ?? "", ...bookmark.tags]}
      accessory={
        bookmark.pinned ? { icon: Icon.Star, tooltip: "Favorite" } : undefined
      }
      actions={actionsFor(bookmark)}
    />
  ));

  return (
    <Grid
      columns={5}
      isLoading={isLoading}
      filtering={false}
      searchText={query}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search titles, URLs, descriptions, or tags"
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Filter Scope"
          value={scope}
          onChange={setScope}
          storeValue
        >
          <Grid.Dropdown.Item title="All" value="all" icon={Icon.List} />
          <Grid.Dropdown.Item
            title="Favorite"
            value="favorites"
            icon={Icon.Star}
          />
          <Grid.Dropdown.Item
            title="Recently Used"
            value="recent"
            icon={Icon.ArrowClockwise}
          />
          <Grid.Dropdown.Item title="Trash" value="trash" icon={Icon.Trash} />
          {libraryState.catalog.groups
            .filter(
              (group) =>
                !group.isDeleted && group.id !== TRASH_LOCATION.groupId,
            )
            .map((group) => (
              <Grid.Dropdown.Section
                key={group.id}
                title={categoryTitle(group.id, group.name)}
              >
                {group.children
                  .filter((sub) => !sub.isDeleted)
                  .map((sub) => (
                    <Grid.Dropdown.Item
                      key={`${group.id}/${sub.id}`}
                      value={locationValue({
                        groupId: group.id,
                        subGroupId: sub.id,
                      })}
                      title={categoryTitle(sub.id, sub.name)}
                    />
                  ))}
              </Grid.Dropdown.Section>
            ))}
        </Grid.Dropdown>
      }
    >
      {visible.fallback ? (
        <Grid.Section title="Universal Match Fallback">{items}</Grid.Section>
      ) : (
        items
      )}
      {!items.length && (
        <Grid.EmptyView
          icon={Icon.Bookmark}
          title={
            query
              ? "No matching bookmarks"
              : scope === "trash"
                ? "Trash is empty"
                : "No bookmarks yet"
          }
          description={
            query
              ? "No local results; no global search entry is registered"
              : "Add your first bookmark below"
          }
          actions={
            <ActionPanel>
              {!conflicted && looksLikeHttpUrl(query) && (
                <>
                  <Action
                    title="Save This Link"
                    icon={Icon.Plus}
                    onAction={() => {
                      const url = query.trim();
                      push(
                        <BookmarkForm
                          root={libraryRoot}
                          state={libraryState}
                          seed={{ url, title: hostOf(url) }}
                          onSaved={(next) => setState(next)}
                        />,
                      );
                    }}
                  />
                  <Action
                    title="Save This Link with AI"
                    icon={Icon.Wand}
                    onAction={() =>
                      void (async () => {
                        const url = query.trim();
                        let seed = {
                          url,
                          title: hostOf(url),
                          desc: undefined as string | undefined,
                          tags: undefined as string[] | undefined,
                        };
                        try {
                          const config = aiConfigFromPreferences(preferences);
                          const suggestion = await suggestMetadata(config, {
                            url,
                          });
                          seed = {
                            url,
                            title: suggestion.title?.trim() || hostOf(url),
                            desc: suggestion.desc,
                            tags: suggestion.tags,
                          };
                        } catch (error) {
                          await showToast({
                            style: Toast.Style.Failure,
                            title: "AI unavailable; saved normally instead",
                            message: failureMessage(error),
                          });
                        }
                        push(
                          <BookmarkForm
                            root={libraryRoot}
                            state={libraryState}
                            seed={seed}
                            onSaved={(next) => setState(next)}
                          />,
                        );
                      })()
                    }
                  />
                </>
              )}
              {!conflicted && (
                <Action
                  title="Add Bookmark"
                  icon={Icon.Plus}
                  onAction={() =>
                    push(
                      <BookmarkForm
                        root={libraryRoot}
                        state={libraryState}
                        onSaved={(next) => setState(next)}
                      />,
                    )
                  }
                />
              )}
              <Action
                title="Open Extension Preferences"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
              <Action.Push
                title="Settings & Data"
                icon={Icon.Gear}
                target={<ManageData onClose={load} />}
              />
            </ActionPanel>
          }
        />
      )}
    </Grid>
  );
}

function TemplateForm({
  fields,
  bookmark,
  onSubmit,
}: {
  fields: string[];
  bookmark: Bookmark;
  onSubmit: (values: Record<string, string>) => Promise<boolean>;
}) {
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle={`Open: ${bookmark.title}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Open"
            icon={Icon.Globe}
            onSubmit={async (values: Form.Values) => {
              const succeeded = await onSubmit(
                Object.fromEntries(
                  fields.map((field) => [field, String(values[field] ?? "")]),
                ),
              );
              if (succeeded) pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description title="Template" text={bookmark.url} />
      {fields.map((field) => (
        <Form.TextField
          key={field}
          id={field}
          title={`{${field}}`}
          placeholder="Parameter value (URL-encoded)"
        />
      ))}
    </Form>
  );
}

function LocationsForm({
  root,
  state,
  bookmark,
  onSaved,
}: {
  root: string;
  state: LibraryState;
  bookmark: Bookmark;
  onSaved: (state: LibraryState) => void;
}) {
  const { pop } = useNavigation();
  const [values, setValues] = useState<string[]>(
    bookmark.locations.map(locationValue),
  );
  const options = locationOptions(state.catalog);
  return (
    <Form
      navigationTitle="Manage Category Locations"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Locations"
            icon={Icon.Checkmark}
            onSubmit={async () => {
              if (!values.length) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Keep at least one category location",
                  message:
                    "To remove all categories, move the bookmark to Trash",
                });
                return;
              }
              try {
                const result = await commit(root, {
                  mutations: [
                    bookmarkMutation(state, {
                      ...bookmark,
                      locations: values.map(parseLocationValue),
                      updatedAt: Date.now(),
                    }),
                  ],
                  expectedHeads: state.heads,
                });
                onSaved(result.state);
                await showToast({
                  style: Toast.Style.Success,
                  title: "Category locations updated",
                  message: result.warning ?? bookmark.title,
                });
                pop();
              } catch (error) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Not saved",
                  message: failureMessage(error),
                });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Bookmark"
        text={`${bookmark.title}\n${bookmark.url}`}
      />
      <Form.TagPicker
        id="locations"
        title="Category Locations (multiple)"
        value={values}
        onChange={setValues}
        placeholder="Select or search categories"
      >
        {options.map((option) => (
          <Form.TagPicker.Item
            key={option.value}
            value={option.value}
            title={option.title}
          />
        ))}
      </Form.TagPicker>
    </Form>
  );
}
