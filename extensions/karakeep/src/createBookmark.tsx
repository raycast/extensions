import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { useEffect, useState } from "react";
import { logger } from "@chrismessina/raycast-logger";
import { fetchAddBookmarkToList, fetchCreateBookmark } from "./apis";
import { useGetAllLists } from "./hooks/useGetAllLists";
import { useTranslation } from "./hooks/useTranslation";
import { useConfig } from "./hooks/useConfig";
import { getBrowserLink } from "./hooks/useBrowserLink";
import { validUrl } from "./utils/url";
import { runWithToast } from "./utils/toast";

interface FormValues {
  url: string;
  list?: string;
}

export default function CreateBookmarkView() {
  const { pop } = useNavigation();
  const { t } = useTranslation();
  const { lists } = useGetAllLists();
  const { config } = useConfig();
  const [isLoadingTab, setIsLoadingTab] = useState(false);

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

            return created;
          },
        });

        if (bookmark) {
          pop();
        }
      } catch (error) {
        logger.error("Failed to create bookmark", { url: values.url, error });
      }
    },
  });

  useEffect(() => {
    async function loadBrowserTab() {
      if (!config.prefillUrlFromBrowser) return;

      setIsLoadingTab(true);
      try {
        const url = await getBrowserLink();
        if (url) {
          setValue("url", url);
        }
      } catch (error) {
        // Browser extension not available or no permission
        logger.log("Failed to prefill URL from browser", error);
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
    </Form>
  );
}
