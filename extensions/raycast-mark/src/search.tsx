import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Action,
  ActionPanel,
  Alert,
  Detail,
  Form,
  Icon,
  Keyboard,
  LaunchType,
  List,
  Toast,
  confirmAlert,
  environment,
  getPreferenceValues,
  launchCommand,
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
  TRASH_LOCATION,
} from "./model.ts";
import type { Bookmark, LibraryState, Mutation, Visit } from "./model.ts";
import { ensureIconForBookmark, iconImageSource } from "./icon-service.ts";
import { commit, configureDirectory, readLibrary } from "./repository.ts";
import { aiConfigFromPreferences, suggestMetadata } from "./ai.ts";

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
      setFailure(undefined);
      if (library.status === "conflicted")
        await showToast({
          style: Toast.Style.Failure,
          title: "存在未解决冲突，本次只读",
          message: "请在 Manage Marks Data 中解决冲突后才能写入",
        });
    } catch (error) {
      setFailure(failureMessage(error));
    }
    setIsLoading(false);
  }, [preferences.dataDirectory]);

  useEffect(() => {
    void load();
  }, [load]);

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
        title: "未写入",
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
        title: "无法打开",
        message: failureMessage(error),
      });
      return false;
    }
    try {
      await open(url);
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "无法打开链接",
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
          title: "已打开并记录访问，请注意",
          message: result.warning,
        });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "已打开，但未能记录访问",
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
        (bookmark) => !bookmark.isDeleted && bookmark.allowUniversal === true,
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
        markdown={`# 无法读取本地库\n\n${failure}\n\n请确认数据目录存在且为专用目录（空或仅含 \`events\`），或在扩展设置中修改数据目录。切换目录不会搬迁或删除旧库。`}
        actions={
          <ActionPanel>
            <Action
              title="重新加载"
              icon={Icon.ArrowClockwise}
              onAction={load}
            />
            <Action
              title="打开扩展设置"
              icon={Icon.Gear}
              onAction={openExtensionPreferences}
            />
          </ActionPanel>
        }
      />
    );
  }

  if (!root || !state) {
    return (
      <List isLoading>
        <List.EmptyView title="正在读取本地库" />
      </List>
    );
  }

  if (state.status === "blocked") {
    const issues = state.issues
      .map(
        (issue) =>
          `- \`${issue.code}\` ${issue.message}${issue.file ? `（${issue.file}）` : ""}`,
      )
      .join("\n");
    return (
      <Detail
        markdown={`# 本地库已暂停写入\n\n检测到不可读或不安全的数据，不会以空库覆盖本地文件，也不会展示未经校验的数据。\n\n${issues}\n\n数据目录：\`${root}\``}
        actions={
          <ActionPanel>
            <Action
              title="重新加载"
              icon={Icon.ArrowClockwise}
              onAction={load}
            />
            <Action
              title="打开扩展设置"
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
          title={fields.length ? "填写参数并打开" : "打开"}
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
          title="复制 URL"
          content={bookmark.url}
          shortcut={Keyboard.Shortcut.Common.Copy}
        />
        {!conflicted && (
          <>
            <Action
              title="新增书签"
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
              title="编辑"
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
                title="管理分类位置"
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
            title={bookmark.pinned ? "取消收藏" : "加入收藏"}
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
                bookmark.pinned ? "已取消收藏" : "已加入收藏",
                bookmark.title,
              )
            }
          />
        )}
        {!conflicted &&
          (bookmark.isDeleted ? (
            <Action
              title="恢复"
              icon={Icon.ArrowCounterClockwise}
              onAction={() =>
                void applyCommit(
                  [restoreBookmark(libraryState, bookmark)],
                  undefined,
                  "已恢复",
                  bookmark.title,
                )
              }
            />
          ) : (
            <Action
              title="移入回收站"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={Keyboard.Shortcut.Common.Remove}
              onAction={async () => {
                const confirmed = await confirmAlert({
                  title: "移入回收站？",
                  message: `${bookmark.title} 将移入回收站，之后可恢复。`,
                  primaryAction: {
                    title: "移入回收站",
                    style: Alert.ActionStyle.Destructive,
                  },
                });
                if (confirmed)
                  void applyCommit(
                    [deleteBookmark(libraryState, bookmark)],
                    undefined,
                    "已移入回收站",
                    bookmark.title,
                  );
              }}
            />
          ))}
        {conflicted && (
          <Action
            title="解决冲突…"
            icon={Icon.Warning}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            onAction={() =>
              void launchCommand({
                name: "manage-data",
                type: LaunchType.UserInitiated,
              })
            }
          />
        )}
        {!conflicted && (
          <Action
            title="刷新图标"
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
                    "已刷新图标",
                    bookmark.title,
                  );
                } catch (error) {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "刷新图标失败",
                    message: failureMessage(error),
                  });
                }
              })()
            }
          />
        )}

        <Action
          title="打开扩展设置"
          icon={Icon.Gear}
          shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
          onAction={openExtensionPreferences}
        />
      </ActionPanel>
    );
  }

  const items = visible.items.map((bookmark) => (
    <List.Item
      key={bookmark.id}
      id={bookmark.id}
      title={bookmark.title}
      subtitle={hostOf(bookmark.url)}
      icon={listIcon(bookmark)}
      accessories={[
        ...(bookmark.isDeleted ? [{ tag: "回收站" }] : []),
        ...(bookmark.tags.length
          ? [
              {
                tag: `${bookmark.tags.length} 标签`,
                tooltip: bookmark.tags.join("、"),
              },
            ]
          : []),
        ...(bookmark.visits ? [{ text: `${bookmark.visits} 次` }] : []),
      ]}
      actions={actionsFor(bookmark)}
    />
  ));

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      searchText={query}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="搜索标题、网址、描述或标签"
      searchBarAccessory={
        <List.Dropdown
          tooltip="筛选范围"
          value={scope}
          onChange={setScope}
          storeValue
        >
          <List.Dropdown.Item title="全部" value="all" icon={Icon.List} />
          <List.Dropdown.Item title="收藏" value="favorites" icon={Icon.Star} />
          <List.Dropdown.Item
            title="最近使用"
            value="recent"
            icon={Icon.ArrowClockwise}
          />
          <List.Dropdown.Item title="回收站" value="trash" icon={Icon.Trash} />
          {libraryState.catalog.groups
            .filter(
              (group) =>
                !group.isDeleted && group.id !== TRASH_LOCATION.groupId,
            )
            .map((group) => (
              <List.Dropdown.Section key={group.id} title={group.name}>
                {group.children
                  .filter((sub) => !sub.isDeleted)
                  .map((sub) => (
                    <List.Dropdown.Item
                      key={`${group.id}/${sub.id}`}
                      value={locationValue({
                        groupId: group.id,
                        subGroupId: sub.id,
                      })}
                      title={sub.name}
                    />
                  ))}
              </List.Dropdown.Section>
            ))}
        </List.Dropdown>
      }
    >
      {visible.fallback ? (
        <List.Section title="万能匹配回退" subtitle="本地没有搜索结果">
          {items}
        </List.Section>
      ) : (
        items
      )}
      {!items.length && (
        <List.EmptyView
          icon={Icon.Bookmark}
          title={
            query
              ? "没有匹配的书签"
              : scope === "trash"
                ? "回收站为空"
                : "还没有书签"
          }
          description={
            query
              ? "本地未匹配到结果，也不会注册任何全局搜索入口"
              : "用“新增书签”命令或下面的操作添加第一个书签"
          }
          actions={
            <ActionPanel>
              {!conflicted && looksLikeHttpUrl(query) && (
                <>
                  <Action
                    title="保存此链接"
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
                    title="AI 保存此链接"
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
                            title: "AI 不可用，已降级为普通保存",
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
                  title="新增书签"
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
                title="打开扩展设置"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
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
      navigationTitle={`打开：${bookmark.title}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="打开"
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
      <Form.Description title="模板" text={bookmark.url} />
      {fields.map((field) => (
        <Form.TextField
          key={field}
          id={field}
          title={`{${field}}`}
          placeholder="参数值（会做 URL 编码）"
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
      navigationTitle="管理分类位置"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="保存位置"
            icon={Icon.Checkmark}
            onSubmit={async () => {
              if (!values.length) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "至少保留一个分类位置",
                  message: "如需移出所有分类，请使用“移入回收站”",
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
                  title: "已更新分类位置",
                  message: result.warning ?? bookmark.title,
                });
                pop();
              } catch (error) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "未写入",
                  message: failureMessage(error),
                });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="书签"
        text={`${bookmark.title}\n${bookmark.url}`}
      />
      <Form.TagPicker
        id="locations"
        title="分类位置（可多选）"
        value={values}
        onChange={setValues}
        placeholder="选择或搜索分类"
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
