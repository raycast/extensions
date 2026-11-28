import { Action, ActionPanel, Form, Icon, LaunchProps, showToast, Toast, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { useCallback, useEffect, useState } from "react";
import { logger } from "@chrismessina/raycast-logger";
import {
  fetchAddBookmarkToList,
  fetchAttachTagsToBookmark,
  fetchCreateBookmarkResult,
  fetchUpdateBookmark,
} from "./apis";
import { useGetAllLists } from "./hooks/useGetAllLists";
import { useGetAllTags } from "./hooks/useGetAllTags";
import { useTagPicker, TAG_PICKER_NOOP_VALUE } from "./hooks/useTagPicker";
import { useTranslation } from "./hooks/useTranslation";
import { useConfig } from "./hooks/useConfig";
import { canReadPageTitle, getBrowserLink, getBrowserTab } from "./hooks/useBrowserLink";
import { validUrl } from "./utils/url";
import { attachCopyDetail, markToastFailed } from "./utils/toast";
import { ensureReachable } from "./utils/submitGuard";
import { useApiReachable } from "./hooks/useApiReachable";
import { OfflineFormNotice, OpenSettingsAction, StartKarakeepAction } from "./components/OfflineFormNotice";
import CreateListView from "./createList";

const log = logger.child("[CreateBookmark]");
const MAX_TITLE_LENGTH = 1000;

/** How far a submission got before it threw — the toast title depends on it. */
type SubmitStep = "create" | "list" | "tags" | "title";

const SUBMIT_FAILURE_TITLES: Record<SubmitStep, string> = {
  create: "bookmark.createFailed", // "Couldn't create bookmark"
  list: "bookmark.savedListFailed", // "Bookmark saved, but couldn't add to list"
  tags: "bookmark.savedTagsFailed", // "Bookmark saved, but couldn't add tags"
  title: "bookmark.savedTitleFailed", // "Bookmark saved, but couldn't edit title"
};

interface FormValues {
  url: string;
  title: string;
  list?: string;
}

interface DraftValues extends FormValues {
  tagIds?: string[];
  pendingNewTag?: string;
}

export default function CreateBookmarkView(props: LaunchProps<{ draftValues: DraftValues }>) {
  const { pop, push } = useNavigation();
  const { t } = useTranslation();
  // Hold the lists/tags fetches until the API is known to be up. Firing them
  // blind is what produced Raycast's opaque "Failed to fetch latest data /
  // fetch failed" toast before any of our own handling could run.
  const {
    state: reachability,
    reachable: apiReachable,
    offline,
    unauthorized,
    isRecovering,
    canStart,
    start,
  } = useApiReachable();
  const { lists, revalidate: revalidateLists } = useGetAllLists(apiReachable);
  const { tags } = useGetAllTags(apiReachable);

  const { config } = useConfig();
  const { draftValues } = props;
  const [isLoadingTab, setIsLoadingTab] = useState(false);
  const [createdListIdToSelect, setCreatedListIdToSelect] = useState<string | null>(null);
  const initialSelectedTagIds = draftValues?.tagIds ?? [];
  const {
    selectedTagIds,
    newTagItems,
    pendingInput,
    onTagIdsChange,
    onPendingInputChange,
    commitPendingTag,
    buildTagsToAttach,
  } = useTagPicker({ tags, initialTagIds: initialSelectedTagIds });

  const { handleSubmit, itemProps, setValue, values } = useForm<FormValues>({
    initialValues: {
      url: draftValues?.url ?? "",
      title: draftValues?.title ?? "",
      list: draftValues?.list ?? "",
    },
    validation: {
      url: (value: string | undefined) => {
        if (!value) return t("bookmark.urlInvalid");
        if (!validUrl(value)) return t("bookmark.urlInvalid");
        return undefined;
      },
      title: (value: string | undefined) => {
        if (value && value.trim().length > MAX_TITLE_LENGTH) return t("bookmark.titleTooLong");
        return undefined;
      },
    },
    async onSubmit(values) {
      log.info("Submitting bookmark", { url: values.url, hasList: Boolean(values.list) });

      // Pre-flight: if the instance is a stopped local container, offer to start
      // it BEFORE attempting the write. Submitting into a dead server just to
      // fail is the path that puts the typed-in URL at risk.
      const recovered = await ensureReachable(values.url);
      if (recovered !== "ok") {
        // The form stays mounted with its values intact, so nothing is lost;
        // the URL is on the clipboard as a second line of defence.
        return;
      }

      // Saving is up to four separate writes with no transaction around them. A single
      // pass/fail toast for all four claims the bookmark was never created when it was in
      // fact saved and only a tag or list call failed — so track how far we got and let
      // the toast name what actually landed.
      let step: SubmitStep = "create";
      const toast = await showToast({ style: Toast.Style.Animated, title: t("bookmark.creating") });

      try {
        const title = values.title.trim();
        const payload = {
          type: "link",
          url: values.url,
          createdAt: new Date().toISOString(),
          ...(title ? { title } : {}),
        };
        const result = await fetchCreateBookmarkResult(payload);
        const bookmarkId = result.bookmark.id;

        if (values.list) {
          step = "list";
          await fetchAddBookmarkToList(values.list, bookmarkId);
        }

        const tagsToAttach = buildTagsToAttach();
        if (tagsToAttach.length > 0) {
          step = "tags";
          await fetchAttachTagsToBookmark(bookmarkId, tagsToAttach);
        }

        // Renaming an EXISTING bookmark is the only step that overwrites data the user
        // already had, so it runs last — nothing after it can fail and strand the form
        // on a failure toast when the rename has already been committed. A bookmark we
        // just created carries its title from the POST payload and needs no PATCH.
        if (title && !result.wasCreated) {
          step = "title";
          await fetchUpdateBookmark(bookmarkId, { title });
        }

        toast.style = Toast.Style.Success;
        toast.title = t("bookmark.createSuccess");
        log.info("Bookmark saved", { bookmarkId, wasCreated: result.wasCreated });
        pop();
      } catch (error) {
        // The form stays mounted on every failure, so the URL, title, list and tag
        // selection all survive for a retry. Re-submitting is safe for the steps that
        // already succeeded: the create call returns the existing bookmark instead of a
        // duplicate, and the list and tag calls re-apply the same values.
        markToastFailed(toast, t(SUBMIT_FAILURE_TITLES[step]), error);
        log.error("Failed to save bookmark", { url: values.url, step, error });
      }
    },
  });

  useEffect(() => {
    async function loadBrowserTab() {
      if (!config.prefillUrlFromBrowser) return;
      if (values.url?.trim()) return;

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
  }, [config.prefillUrlFromBrowser, setValue, values.url]);

  // Opt-in, never automatic. A filled title becomes a user override that
  // permanently shadows the title Karakeep crawls, and — because the submit path
  // PATCHes a non-empty title onto an existing bookmark — pre-filling it would
  // silently rename any bookmark whose URL you already had.
  const usePageTitle = useCallback(async () => {
    const tab = await getBrowserTab();
    if (!tab?.title) {
      // The action only renders when the Browser Extension is reachable, so this
      // is not "not installed" — it is no open tab, or a tab still loading, which
      // has no title yet.
      log.warn("No page title available from the active tab", { hasTab: Boolean(tab) });
      const toast = await showToast({ style: Toast.Style.Failure, title: t("bookmark.usePageTitleFailed") });
      attachCopyDetail(
        toast,
        [
          "The browser extension returned no page title for the active tab.",
          "Most likely the tab is still loading, or no tab is open.",
          `tab: ${tab ? tab.url : "none found"}`,
        ].join("\n"),
      );
      return;
    }
    log.info("Filled title from browser tab", { title: tab.title });
    setValue("title", tab.title);
  }, [setValue, t]);

  useEffect(() => {
    if (!createdListIdToSelect) return;

    const hasList = lists.some((list) => list.id === createdListIdToSelect);
    if (hasList) {
      setValue("list", createdListIdToSelect);
      setCreatedListIdToSelect(null);
    }
  }, [createdListIdToSelect, lists, setValue]);

  return (
    <Form
      isLoading={isLoadingTab || reachability === "checking"}
      enableDrafts
      actions={
        <ActionPanel>
          {/* First = bound to ↵. While offline the form can't submit, so Start
              takes the primary slot and Submit steps down to second. */}
          <OpenSettingsAction unauthorized={unauthorized} />
          <StartKarakeepAction offline={offline} canStart={canStart} isRecovering={isRecovering} onStart={start} />
          <Action.SubmitForm title={t("bookmark.create")} onSubmit={handleSubmit} />
          {/* Titles come only from the Browser Extension, which is absent when it
              isn't installed and on Windows, where Raycast doesn't expose the API
              yet. Hide the action there rather than offer one that always fails. */}
          {canReadPageTitle() && (
            <Action
              title={t("bookmark.usePageTitle")}
              icon={Icon.Text}
              shortcut={{
                macOS: { modifiers: ["cmd"], key: "t" },
                Windows: { modifiers: ["ctrl"], key: "t" },
              }}
              onAction={usePageTitle}
            />
          )}
          <Action
            title={t("list.createList")}
            onAction={() =>
              push(
                <CreateListView
                  showSuccessHUD={false}
                  onListCreated={async (list) => {
                    setCreatedListIdToSelect(list.id);
                    await revalidateLists();
                  }}
                />,
              )
            }
          />
        </ActionPanel>
      }
    >
      <OfflineFormNotice offline={offline} canStart={canStart} unauthorized={unauthorized} />

      <Form.TextField {...itemProps.url} title={t("bookmark.url")} placeholder={t("bookmark.urlPlaceholder")} />

      <Form.TextField
        {...itemProps.title}
        title={t("bookmark.createTitle")}
        placeholder={t("bookmark.createTitlePlaceholder")}
      />

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
        <Form.TagPicker.Item value={TAG_PICKER_NOOP_VALUE} title=" " />
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
        onBlur={commitPendingTag}
      />
    </Form>
  );
}
