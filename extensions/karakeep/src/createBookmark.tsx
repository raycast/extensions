import { Action, ActionPanel, Form, FormDropdownProps, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { fetchAddBookmarkToList, fetchCreateBookmark } from "./apis";
import { BookmarkDetail } from "./components/BookmarkDetail";
import { useGetAllLists } from "./hooks/useGetAllLists";
import { useTranslation } from "./hooks/useTranslation";
import { useConfig } from "./hooks/useConfig";
import { Bookmark } from "./types";
import { validUrl } from "./utils/url";

interface FormValues {
  type: "text" | "link";
  url?: string;
  content?: string;
  list?: string;
}

export default function CreateBookmarkView() {
  const { push, pop } = useNavigation();
  const { t } = useTranslation();
  const { lists } = useGetAllLists();
  const { config } = useConfig();

  const { handleSubmit, itemProps, values } = useForm<FormValues>({
    initialValues: {
      type: config.createBookmarkType,
    },
    validation: {
      type: FormValidation.Required,
      content: (value: string | undefined) => {
        if (values.type === "text") {
          if (!value) return t("bookmark.contentRequired");
          if (value.length > 2500) return t("bookmark.contentTooLong");
        }
        return undefined;
      },
      url: (value: string | undefined) => {
        if (values.type === "link") {
          if (!value) return t("bookmark.urlInvalid");
          if (!validUrl(value)) return t("bookmark.urlInvalid");
        }
        return undefined;
      },
    },
    async onSubmit(values) {
      const toast = await showToast({
        title: t("bookmark.creating"),
        style: Toast.Style.Animated,
      });

      try {
        const basePayload = {
          createdAt: new Date().toISOString(),
        };

        const content =
          values.type === "text" ? { type: "text", text: values.content } : { type: "link", url: values.url };

        const payload = {
          ...basePayload,
          ...content,
        };
        const bookmark = (await fetchCreateBookmark(payload)) as Bookmark;

        if (values.list) {
          if (bookmark) {
            await fetchAddBookmarkToList(values.list, bookmark?.id);
          }
        }

        if (values.type === "text") {
          push(<BookmarkDetail bookmark={bookmark as Bookmark} />);
        } else {
          pop();
        }

        toast.style = Toast.Style.Success;
        toast.title = t("bookmark.createSuccess");
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = t("bookmark.createFailed");
        toast.message = String(error);
      }
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={t("bookmark.create")} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown title={t("bookmark.type")} {...(itemProps.type as unknown as FormDropdownProps)}>
        <Form.Dropdown.Item value="text" title={t("bookmark.typeText")} />
        <Form.Dropdown.Item value="link" title={t("bookmark.typeLink")} />
      </Form.Dropdown>

      {itemProps.type.value === "text" ? (
        <Form.TextArea
          {...itemProps.content}
          title={t("bookmark.content")}
          placeholder={t("bookmark.contentPlaceholder")}
        />
      ) : (
        <Form.TextField {...itemProps.url} title={t("bookmark.url")} placeholder={t("bookmark.urlPlaceholder")} />
      )}

      <Form.Dropdown title={t("bookmark.list")} {...itemProps.list}>
        <Form.Dropdown.Item value="" title={t("bookmark.defaultListPlaceholder")} />
        {lists.map((list) => (
          <Form.Dropdown.Item key={list.id} value={list.id} title={list.name} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
