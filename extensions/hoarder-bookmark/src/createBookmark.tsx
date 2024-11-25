import { Action, ActionPanel, Form, FormDropdownProps, showToast, Toast, useNavigation } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { fetchCreateBookmark } from "./apis";
import { validUrl } from "./utils/url";
import { BookmarkDetail } from "./components/BookmarkDetail";
import { useTranslation } from "./hooks/useTranslation";
import { Bookmark } from "./types";

interface FormValues {
  type: "text" | "link";
  url?: string;
  content?: string;
}

export default function CreateBookmarkView() {
  const { push, pop } = useNavigation();
  const { t } = useTranslation();

  const { handleSubmit, itemProps, values } = useForm<FormValues>({
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

      const basePayload = {
        createdAt: new Date().toISOString(),
      };

      const content =
        values.type === "text" ? { type: "text", text: values.content } : { type: "link", url: values.url };

      try {
        const payload = {
          ...basePayload,
          ...content,
        };
        const bookmark = await fetchCreateBookmark(payload);
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
    </Form>
  );
}
