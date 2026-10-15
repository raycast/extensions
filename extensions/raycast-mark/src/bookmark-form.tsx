import { categoryTitle, t } from "./i18n.ts";
import { randomUUID } from "node:crypto";
import { useState } from "react";
import {
  Action,
  ActionPanel,
  Form,
  Icon,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import { normalizeBookmarkUrl } from "./bookmark-utils.ts";
import {
  bookmarkMutation,
  DEFAULT_LOCATION,
  LibraryError,
  TRASH_LOCATION,
} from "./model.ts";
import type { Bookmark, Catalog, LibraryState, Location } from "./model.ts";
import { fetchAndPersistIcon, fetchPageDescription } from "./icon-service.ts";
import { commit } from "./repository.ts";

/** Shared failure text for bookmark and data actions. */
export function failureMessage(error: unknown): string {
  if (error instanceof LibraryError) return `${error.code}：${error.message}`;
  return error instanceof Error && error.message
    ? error.message
    : t("发生未知错误");
}

const LOCATION_PREFIX = "loc:";

export function locationValue(location: Location): string {
  return `${LOCATION_PREFIX}${encodeURIComponent(location.groupId)}:${encodeURIComponent(location.subGroupId)}`;
}

export function parseLocationValue(value: string): Location {
  const [, groupId, subGroupId] = value.split(":");
  return {
    groupId: decodeURIComponent(groupId),
    subGroupId: decodeURIComponent(subGroupId),
  };
}

export function locationOptions(
  catalog: Catalog,
): { value: string; title: string }[] {
  return catalog.groups
    .filter((group) => !group.isDeleted && group.id !== TRASH_LOCATION.groupId)
    .flatMap((group) =>
      group.children
        .filter((sub) => !sub.isDeleted && sub.id !== TRASH_LOCATION.subGroupId)
        .map((sub) => ({
          value: locationValue({ groupId: group.id, subGroupId: sub.id }),
          title: `${categoryTitle(group.id, group.name)} › ${categoryTitle(sub.id, sub.name)}`,
        })),
    );
}

export interface BookmarkFormProps {
  root: string;
  state: LibraryState;
  bookmark?: Bookmark;
  /** Prefill for create (ignored when editing). */
  seed?: { url?: string; title?: string; desc?: string; tags?: string[] };
  onSaved: (state: LibraryState, bookmark: Bookmark) => void;
}

/** Shared create/edit form. Heads are captured when the form is opened; stale writes are rejected. */
export function BookmarkForm({
  root,
  state,
  bookmark,
  seed,
  onSaved,
}: BookmarkFormProps) {
  const { pop } = useNavigation();
  const [url, setUrl] = useState(bookmark?.url ?? seed?.url ?? "");
  const [title, setTitle] = useState(bookmark?.title ?? seed?.title ?? "");
  const [desc, setDesc] = useState(bookmark?.desc ?? seed?.desc ?? "");
  const [tagsText, setTagsText] = useState(
    (bookmark?.tags ?? seed?.tags ?? []).join(", "),
  );
  const tags = tagsText
    .split(/[,，]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
  const [pinned, setPinned] = useState(bookmark?.pinned === true);
  const [allowUniversal, setAllowUniversal] = useState(
    bookmark?.allowUniversal === true,
  );
  const [locations, setLocations] = useState<string[]>(
    (bookmark?.locations ?? [DEFAULT_LOCATION]).map(locationValue),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const deleted = bookmark?.isDeleted === true;
  const options = locationOptions(state.catalog);

  async function save() {
    let normalized: string;
    try {
      normalized = normalizeBookmarkUrl(url);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: t("网址无效"),
        message: failureMessage(error),
      });
      return;
    }
    const nextTitle = title.trim();
    if (!nextTitle) {
      await showToast({ style: Toast.Style.Failure, title: t("请填写标题") });
      return;
    }
    const nextLocations = deleted
      ? (bookmark?.locations ?? [DEFAULT_LOCATION])
      : locations.map(parseLocationValue);
    if (!nextLocations.length) {
      await showToast({
        style: Toast.Style.Failure,
        title: t("请至少选择一个分类位置"),
        message: t("如需移出所有分类，请使用“移入回收站”"),
      });
      return;
    }
    const now = Date.now();
    let value: Bookmark = bookmark
      ? {
          ...bookmark,
          title: nextTitle,
          url: normalized,
          desc: desc.trim() || undefined,
          tags: [...new Set(tags)],
          pinned,
          allowUniversal,
          locations: nextLocations,
          updatedAt: now,
        }
      : {
          id: randomUUID(),
          title: nextTitle,
          url: normalized,
          desc: desc.trim() || undefined,
          tags: [...new Set(tags)],
          pinned,
          allowUniversal,
          locations: nextLocations,
          createdAt: now,
          updatedAt: now,
        };
    setIsSubmitting(true);
    try {
      const urlChanged = !bookmark || bookmark.url !== normalized;
      if (
        !bookmark ||
        urlChanged ||
        !bookmark.icon ||
        bookmark.icon.type === "text"
      ) {
        try {
          const icon = await fetchAndPersistIcon(root, normalized, nextTitle);
          value = { ...value, icon, iconMatchedAt: Date.now() };
        } catch {
          /* keep previous icon / none */
        }
      }
      const result = await commit(root, {
        mutations: [bookmarkMutation(state, value)],
        expectedHeads: state.heads,
      });
      onSaved(result.state, value);
      await showToast({
        style: result.sharedSyncPaused
          ? Toast.Style.Failure
          : Toast.Style.Success,
        title: result.sharedSyncPaused
          ? t("本地已保存，同步暂停")
          : bookmark
            ? t("已更新书签")
            : t("已新增书签"),
        message: result.warning ?? value.title,
      });
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: t("未写入"),
        message: failureMessage(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function fillDescription() {
    if (desc.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: t("请先清空已有描述"),
      });
      return;
    }
    try {
      const normalized = normalizeBookmarkUrl(url);
      const description = await fetchPageDescription(normalized);
      if (description) setDesc(description);
      await showToast({
        style: description ? Toast.Style.Success : Toast.Style.Failure,
        title: description ? t("已填入网页描述") : t("未找到网页描述"),
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: t("获取描述失败"),
        message: failureMessage(error),
      });
    }
  }

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle={bookmark ? t("编辑书签") : t("新增书签")}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={bookmark ? t("保存修改") : t("新增书签")}
            icon={Icon.Checkmark}
            onSubmit={save}
          />
          <Action
            title={t("从网页获取描述")}
            icon={Icon.Download}
            onAction={fillDescription}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="url"
        title={t("网址")}
        value={url}
        onChange={setUrl}
        placeholder="https://example.com/{query}"
        info={t("只接受 http(s)；{name} 为模板参数，打开时逐项填写")}
      />
      <Form.TextField
        id="title"
        title={t("标题")}
        value={title}
        onChange={setTitle}
      />
      <Form.TextArea
        id="desc"
        title={t("描述")}
        value={desc}
        onChange={setDesc}
      />
      <Form.TextField
        id="tags"
        title={t("标签")}
        value={tagsText}
        onChange={setTagsText}
        placeholder={t("多个标签用逗号分隔")}
      />
      {deleted ? (
        <Form.Description
          title={t("分类位置")}
          text={t("此书签位于回收站；恢复后才可修改分类位置。")}
        />
      ) : (
        <Form.TagPicker
          id="locations"
          title={t("分类位置（可多选）")}
          value={locations}
          onChange={setLocations}
        >
          {options.map((option) => (
            <Form.TagPicker.Item
              key={option.value}
              value={option.value}
              title={option.title}
            />
          ))}
        </Form.TagPicker>
      )}
      <Form.Checkbox
        id="pinned"
        title={t("收藏")}
        label={t("加入 Favorites（置顶）")}
        value={pinned}
        onChange={setPinned}
      />
      <Form.Checkbox
        id="allowUniversal"
        title={t("万能匹配")}
        label={t("本地搜索无结果时作为回退候选")}
        value={allowUniversal}
        onChange={setAllowUniversal}
      />
    </Form>
  );
}
