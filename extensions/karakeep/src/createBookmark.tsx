import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { logger } from "@chrismessina/raycast-logger";
import { fetchAddBookmarkToList, fetchAttachTagsToBookmark, fetchCreateBookmark } from "./apis";
import { useGetAllLists } from "./hooks/useGetAllLists";
import { useGetAllTags } from "./hooks/useGetAllTags";
import { useTranslation } from "./hooks/useTranslation";
import { useConfig } from "./hooks/useConfig";
import { getBrowserLink } from "./hooks/useBrowserLink";
import { validUrl } from "./utils/url";
import { runWithToast } from "./utils/toast";

const log = logger.child("[CreateBookmark]");

interface FormValues {
  url: string;
  list?: string;
}

// Prefix used to distinguish user-typed new tags from existing tag IDs
const NEW_TAG_PREFIX = "new:";

export default function CreateBookmarkView() {
  const { pop } = useNavigation();
  const { t } = useTranslation();
  const { lists } = useGetAllLists();
  const { tags } = useGetAllTags();
  const { config } = useConfig();
  const [isLoadingTab, setIsLoadingTab] = useState(false);

  // Selected tag IDs (existing + new), managed independently from useForm
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  // User-typed new tag names that have been committed as pills
  const [newTagItems, setNewTagItems] = useState<Array<{ id: string; name: string }>>([]);
  // Text the user is currently typing in the new tag field
  const [pendingInput, setPendingInput] = useState("");
  // Ref to avoid stale closure in onTagIdsChange
  const selectedTagIdsRef = useRef<string[]>([]);

  const { handleSubmit, itemProps, setValue } = useForm<FormValues>({
    initialValues: {
      url: "",
    },
    validation: {
      url: (value: string | undefined) => {
        if (!value) return t("bookmark.urlInvalid");
        if (!validUrl(value)) return t("bookmark.urlInvalid");
        return undefined;
      },
    },
    async onSubmit(values) {
      log.info("Submitting bookmark", { url: values.url, hasList: Boolean(values.list) });
      try {
        const bookmark = await runWithToast({
          loading: { title: t("bookmark.creating") },
          success: { title: t("bookmark.createSuccess") },
          failure: { title: t("bookmark.createFailed") },
          action: async () => {
            const payload = {
              type: "link",
              url: values.url,
              createdAt: new Date().toISOString(),
            };
            const created = await fetchCreateBookmark(payload);

            if (values.list) {
              await fetchAddBookmarkToList(values.list, created.id);
            }

            const tagsToAttach: Array<{ tagId?: string; tagName?: string; attachedBy: "human" }> = [];
            for (const v of selectedTagIds) {
              if (v.startsWith(NEW_TAG_PREFIX)) {
                tagsToAttach.push({ tagName: v.slice(NEW_TAG_PREFIX.length), attachedBy: "human" });
              } else {
                tagsToAttach.push({ tagId: v, attachedBy: "human" });
              }
            }
            if (tagsToAttach.length > 0) {
              await fetchAttachTagsToBookmark(created.id, tagsToAttach);
            }

            return created;
          },
        });

        if (bookmark) {
          log.info("Bookmark created", { bookmarkId: bookmark.id });
          pop();
        }
      } catch (error) {
        log.error("Failed to create bookmark", { url: values.url, error });
      }
    },
  });

  function commitNewTag(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (tags.some((t) => t.name.toLowerCase() === trimmed.toLowerCase())) return;
    if (newTagItems.some((t) => t.name.toLowerCase() === trimmed.toLowerCase())) return;

    const id = `${NEW_TAG_PREFIX}${trimmed}`;
    setNewTagItems((prev) => [...prev, { id, name: trimmed }]);
    const next = [...selectedTagIdsRef.current, id];
    selectedTagIdsRef.current = next;
    setSelectedTagIds(next);
  }

  function onPendingInputChange(text: string) {
    if (text.includes(",")) {
      const parts = text.split(",");
      parts.slice(0, -1).forEach((p) => commitNewTag(p));
      setPendingInput(parts[parts.length - 1]);
    } else {
      setPendingInput(text);
    }
  }

  function onTagIdsChange(value: string[]) {
    selectedTagIdsRef.current = value;
    setSelectedTagIds(value);
    setNewTagItems((prev) => prev.filter((item) => value.includes(item.id)));
  }

  useEffect(() => {
    async function loadBrowserTab() {
      if (!config.prefillUrlFromBrowser) return;

      setIsLoadingTab(true);
      try {
        const url = await getBrowserLink();
        if (url) {
          log.log("Prefilled URL from browser tab", { url });
          setValue("url", url);
        }
      } catch (error) {
        // Browser extension not available or no permission
        log.log("Failed to prefill URL from browser", error);
      } finally {
        setIsLoadingTab(false);
      }
    }

    loadBrowserTab();
  }, [config.prefillUrlFromBrowser, setValue]);

  return (
    <Form
      isLoading={isLoadingTab}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={t("bookmark.create")} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField {...itemProps.url} title={t("bookmark.url")} placeholder={t("bookmark.urlPlaceholder")} />

      <Form.Dropdown title={t("bookmark.list")} {...itemProps.list}>
        <Form.Dropdown.Item value="" title={t("bookmark.defaultListPlaceholder")} />
        {lists.map((list) => (
          <Form.Dropdown.Item key={list.id} value={list.id} title={list.name} />
        ))}
      </Form.Dropdown>

      <Form.TagPicker
        id="tagIds"
        title={t("bookmark.tags")}
        placeholder={t("bookmark.tagsPlaceholder")}
        value={selectedTagIds}
        onChange={onTagIdsChange}
      >
        {tags.map((tag) => (
          <Form.TagPicker.Item key={tag.id} value={tag.id} title={tag.name} />
        ))}
        {newTagItems.map((item) => (
          <Form.TagPicker.Item key={item.id} value={item.id} title={item.name} />
        ))}
      </Form.TagPicker>

      <Form.TextField
        id="pendingNewTag"
        title={t("bookmark.newTags")}
        placeholder={t("bookmark.newTagsPlaceholder")}
        value={pendingInput}
        onChange={onPendingInputChange}
        onBlur={() => {
          if (pendingInput.trim()) {
            commitNewTag(pendingInput);
            setPendingInput("");
          }
        }}
      />
    </Form>
  );
}
