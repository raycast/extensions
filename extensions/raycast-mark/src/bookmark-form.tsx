import { categoryTitle, t } from "./i18n.ts";
import { randomUUID } from "node:crypto";
import { useState } from "react";
import {
  Action,
  ActionPanel,
  Form,
  Icon,
  Toast,
  confirmAlert,
  getPreferenceValues,
  showToast,
  useNavigation,
} from "@raycast/api";
import {
  AIError,
  aiConfigFromPreferences,
  aiEndpoint,
  suggestMetadata,
} from "./ai.ts";
import type { SelectedFields, Suggestion } from "./ai.ts";
import { normalizeBookmarkUrl } from "./bookmark-utils.ts";
import {
  bookmarkMutation,
  DEFAULT_LOCATION,
  LibraryError,
  TRASH_LOCATION,
} from "./model.ts";
import type { Bookmark, Catalog, LibraryState, Location } from "./model.ts";
import { fetchAndPersistIcon } from "./icon-service.ts";
import { commit } from "./repository.ts";

/** Stable failure text for the three commands; never includes API keys or raw responses. */
export function failureMessage(error: unknown): string {
  if (error instanceof LibraryError) return `${error.code}：${error.message}`;
  if (error instanceof AIError) return error.message;
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
  const { push, pop } = useNavigation();
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
  const [aiFields, setAiFields] = useState<string[]>([
    "title",
    "url",
    "desc",
    "tags",
  ]);
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
        style: Toast.Style.Success,
        title: bookmark ? t("已更新书签") : t("已新增书签"),
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

  async function requestSuggestion() {
    const selected: SelectedFields = {};
    if (aiFields.includes("title") && title.trim())
      selected.title = title.trim();
    if (aiFields.includes("url") && url.trim()) selected.url = url.trim();
    if (aiFields.includes("desc") && desc.trim()) selected.desc = desc.trim();
    if (aiFields.includes("tags") && tags.length) selected.tags = tags;
    if (!Object.keys(selected).length) {
      await showToast({
        style: Toast.Style.Failure,
        title: t("所选字段没有可发送的内容"),
      });
      return;
    }
    const config = aiConfigFromPreferences(getPreferenceValues<Preferences>());
    let endpoint: string;
    try {
      endpoint = aiEndpoint(config);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: t("AI 配置无效"),
        message: failureMessage(error),
      });
      return;
    }
    const confirmed = await confirmAlert({
      icon: Icon.Stars,
      title: t("发送所选字段到 AI 服务？"),
      message: [
        t`协议：${config.protocol}`,
        t`服务：${endpoint}`,
        t`模型：${config.model || t("未配置")}`,
        t`发送字段：${Object.keys(selected)
          .map(
            (key) =>
              ({
                title: t("标题"),
                url: t("网址"),
                desc: t("描述"),
                tags: t("标签"),
              })[key as "title" | "url" | "desc" | "tags"],
          )
          .join(t("、"))}`,
        "",
        t(
          "不会发送分类位置、访问统计或目录路径。API Key 仅作为认证头发送至上述服务，不进入提示词、书签库或导出；建议需你确认才填入表单。",
        ),
      ].join("\n"),
      primaryAction: { title: t("发送") },
    });
    if (!confirmed) return;
    const controller = new AbortController();
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: t("正在请求 AI 建议"),
      message: endpoint,
      primaryAction: {
        title: t("取消"),
        onAction: () => controller.abort(),
      },
    });
    try {
      const suggestion = await suggestMetadata(
        config,
        selected,
        controller.signal,
      );
      await toast.hide();
      push(
        <SuggestionDetail
          suggestion={suggestion}
          endpoint={endpoint}
          current={{ title, desc, tags }}
          onApply={() => {
            if (suggestion.title) setTitle(suggestion.title);
            if (suggestion.desc !== undefined) setDesc(suggestion.desc);
            if (suggestion.tags) setTagsText(suggestion.tags.join(", "));
          }}
        />,
      );
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = t("未获得建议");
      toast.message = failureMessage(error);
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
            title={t("AI 建议（BYOK）")}
            icon={Icon.Stars}
            shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
            onAction={requestSuggestion}
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
      <Form.Description
        title={t("AI 隐私")}
        text={t(
          "只有下面勾选的字段会在你主动触发时发送给所选协议的服务；建议不会自动保存。",
        )}
      />
      <Form.TagPicker
        id="aiFields"
        title={t("AI 发送字段")}
        value={aiFields}
        onChange={setAiFields}
      >
        <Form.TagPicker.Item value="title" title={t("标题")} />
        <Form.TagPicker.Item value="url" title={t("网址")} />
        <Form.TagPicker.Item value="desc" title={t("描述")} />
        <Form.TagPicker.Item value="tags" title={t("标签")} />
      </Form.TagPicker>
    </Form>
  );
}

function SuggestionDetail({
  suggestion,
  endpoint,
  current,
  onApply,
}: {
  suggestion: Suggestion;
  endpoint: string;
  current: { title: string; desc: string; tags: string[] };
  onApply: () => void;
}) {
  const { pop } = useNavigation();

  const hasSuggestion = Boolean(
    suggestion.title ||
    suggestion.desc !== undefined ||
    suggestion.tags?.length,
  );
  return (
    <Form
      navigationTitle={t("AI 建议（尚未应用）")}
      actions={
        <ActionPanel>
          {hasSuggestion && (
            <Action
              title={t("填入表单")}
              icon={Icon.Pencil}
              onAction={() => {
                onApply();
                pop();
              }}
            />
          )}
          <Action title={t("返回表单")} icon={Icon.ArrowLeft} onAction={pop} />
        </ActionPanel>
      }
    >
      <Form.Description title={t("服务")} text={endpoint} />
      <Form.Description
        title={t("当前标题")}
        text={current.title || t("（空）")}
      />
      <Form.Description
        title={t("建议标题")}
        text={suggestion.title ?? t("（不修改）")}
      />
      <Form.Description
        title={t("当前描述")}
        text={current.desc || t("（空）")}
      />
      <Form.Description
        title={t("建议描述")}
        text={suggestion.desc ?? t("（不修改）")}
      />
      <Form.Description
        title={t("当前标签")}
        text={current.tags.join(", ") || t("（空）")}
      />
      <Form.Description
        title={t("建议标签")}
        text={suggestion.tags?.join(", ") ?? t("（不修改）")}
      />
      <Form.Description
        title={t("说明")}
        text={t("以上内容按纯文本展示。填入表单不会保存，仍需你提交表单。")}
      />
    </Form>
  );
}
