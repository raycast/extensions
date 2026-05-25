import { Action, ActionPanel, Form, LaunchProps, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { useEffect, useState } from "react";
import { logger } from "@chrismessina/raycast-logger";
import { fetchAddBookmarkToList, fetchAttachTagsToBookmark, fetchCreateBookmark } from "./apis";
import { useGetAllLists } from "./hooks/useGetAllLists";
import { useGetAllTags } from "./hooks/useGetAllTags";
import { useTagPicker, TAG_PICKER_NOOP_VALUE } from "./hooks/useTagPicker";
import { useTranslation } from "./hooks/useTranslation";
import { useConfig } from "./hooks/useConfig";
import { getBrowserLink } from "./hooks/useBrowserLink";
import { validUrl } from "./utils/url";
import { runWithToast } from "./utils/toast";
import CreateListView from "./createList";

const log = logger.child("[CreateBookmark]");

interface FormValues {
  url: string;
  list?: string;
}

interface DraftValues extends FormValues {
  tagIds?: string[];
  pendingNewTag?: string;
}

export default function CreateBookmarkView(props: LaunchProps<{ draftValues: DraftValues }>) {
  const { pop, push } = useNavigation();
  const { t } = useTranslation();
  const { lists, revalidate: revalidateLists } = useGetAllLists();
  const { tags } = useGetAllTags();
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
      list: draftValues?.list ?? "",
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

            const tagsToAttach = buildTagsToAttach();
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
      isLoading={isLoadingTab}
      enableDrafts
      actions={
        <ActionPanel>
          <Action.SubmitForm title={t("bookmark.create")} onSubmit={handleSubmit} />
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
