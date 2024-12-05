import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { fetchUpdateBookmark } from "../apis";
import { useTranslation } from "../hooks/useTranslation";
import { Bookmark } from "../types";

interface FormValues {
  title: string;
  note: string;
}

interface BookmarkDetailProps {
  bookmark: Bookmark;
  onRefresh?: () => void;
}

export function BookmarkEdit({ bookmark, onRefresh }: BookmarkDetailProps) {
  const { pop } = useNavigation();
  const { t } = useTranslation();

  const getDefaultTitle = (bookmark: Bookmark): string => {
    if (bookmark.title) {
      return bookmark.title;
    }
    switch (bookmark.content.type) {
      case "link":
        return bookmark.content.title || t("bookmark.untitled");
      case "text":
        return "";
      case "asset":
        if (bookmark.content.assetType === "image") {
          return bookmark.content.fileName || t("bookmark.untitledImage");
        } else if (bookmark.content.assetType === "pdf") {
          return bookmark.content.fileName || t("bookmark.untitled");
        }
        return t("bookmark.untitled");
      default:
        return t("bookmark.untitled");
    }
  };

  const { handleSubmit, itemProps } = useForm<FormValues>({
    initialValues: {
      title: getDefaultTitle(bookmark),
      note: bookmark.note || "",
    },
    async onSubmit(values) {
      const toast = await showToast({
        title: t("bookmark.updating"),
        style: Toast.Style.Animated,
      });

      try {
        const payload = {
          title: values.title.trim(),
          note: values.note.trim(),
        };

        await fetchUpdateBookmark(bookmark.id, payload);

        toast.style = Toast.Style.Success;
        toast.title = t("bookmark.updateSuccess");

        if (onRefresh) {
          await onRefresh();
        }
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = t("bookmark.updateFailed");
        toast.message = String(error);
      }
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={t("bookmark.update")} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        {...itemProps.title}
        title={t("bookmark.customTitle")}
        placeholder={t("bookmark.titlePlaceholder")}
      />

      <Form.TextArea
        {...itemProps.note}
        title={t("bookmark.note")}
        placeholder={t("bookmark.notePlaceholder")}
        enableMarkdown
      />
    </Form>
  );
}
