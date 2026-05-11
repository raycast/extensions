import { Action, ActionPanel, Form, Toast, popToRoot, showToast, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { useCallback, useState } from "react";
import { saveBookmark } from "./lib/bookmark-save";
import { fetchPageTitle } from "./lib/fetch-page-title";
import type { BookmarkItem } from "./lib/types";
import { generateId, isValidUrl } from "./lib/utils";

interface FormValues {
  url: string;
  title: string;
}

interface AddCommandProps {
  onAdd?: () => void;
}

export default function AddCommand({ onAdd }: AddCommandProps = {}) {
  const [isLoadingTitle, setIsLoadingTitle] = useState(false);
  const { pop } = useNavigation();

  const { handleSubmit, itemProps, setValue } = useForm<FormValues>({
    onSubmit: async (values) => {
      const now = Date.now();
      const bookmark: BookmarkItem = {
        id: generateId(values.url.trim()),
        url: values.url.trim(),
        title: values.title.trim(),
        createdAt: now,
        lastAccessedAt: now,
      };

      await saveBookmark(bookmark);

      await showToast({
        style: Toast.Style.Success,
        title: "Bookmark added",
        message: bookmark.title,
      });

      if (onAdd) {
        onAdd();
        pop();
      } else {
        popToRoot();
      }
    },
    validation: {
      url: (value) => {
        if (!value || value.trim().length === 0) {
          return "Please enter a URL";
        }
        if (!isValidUrl(value.trim())) {
          return "Please enter a valid URL";
        }
      },
      title: FormValidation.Required,
    },
  });

  const handleUrlBlur = useCallback(
    async (url?: string) => {
      if (!url || !isValidUrl(url)) {
        return;
      }

      setIsLoadingTitle(true);
      try {
        const title = await fetchPageTitle(url);
        setValue("title", title);
      } catch (error) {
        console.warn("Failed to fetch title:", error);
        setValue("title", url);
      } finally {
        setIsLoadingTitle(false);
      }
    },
    [setValue],
  );

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Bookmark" icon="bookmark" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="URL"
        placeholder="https://example.com"
        {...itemProps.url}
        onBlur={(event) => {
          if (itemProps.url.onBlur) {
            itemProps.url.onBlur(event);
          }
          handleUrlBlur(event.target.value);
        }}
      />
      <Form.TextField
        title="Title"
        placeholder={isLoadingTitle ? "Fetching title..." : "Page title"}
        {...itemProps.title}
        value={itemProps.title.value || ""}
      />
    </Form>
  );
}
