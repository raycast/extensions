import { Action, ActionPanel, Form, getPreferenceValues, popToRoot } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { useEffect } from "react";
import useBookmarks from "../hooks/use-bookmarks";
import useUrlMetadata from "../hooks/use-url-metadata";
import { CreateLinkdingBookmarkFormValues } from "../types/linkding-types";
import { isValidUrl } from "../util/is-valid-url";
import parseTags from "../util/parse-tags";

interface Props {
  url?: string;
  isLoading?: boolean;
}

export const CreateBookmarkForm = ({ url, isLoading }: Props) => {
  const preferences = getPreferenceValues<Preferences>();
  const { createBookmark } = useBookmarks();

  const { handleSubmit, itemProps, setValue, values } = useForm<CreateLinkdingBookmarkFormValues>({
    onSubmit: async (values) => {
      const { tags, ...remainingValues } = values;
      await createBookmark({
        ...remainingValues,
        tag_names: parseTags(tags),
      });
      popToRoot();
    },
    validation: {
      url: (value) => {
        if (!value) return "URL is required";
        if (!isValidUrl(value)) return "URL is invalid";
      },
    },
    initialValues: {
      unread: preferences.createBookmarksAsUnread,
      url,
    },
  });

  useEffect(() => {
    if (url) setValue("url", url);
  }, [url]);

  const metadata = useUrlMetadata(values.url);
  useEffect(() => {
    if (!metadata) return;
    if (!values.title) setValue("title", metadata.title);
    if (!values.description && metadata.description) setValue("description", metadata.description);
  }, [metadata]);

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel title="Create Bookmark">
          <Action.SubmitForm onSubmit={handleSubmit} title="Create Bookmark" />
        </ActionPanel>
      }
    >
      <Form.TextField title="URL" placeholder="https://raycast.com" {...itemProps.url} />
      <Form.TextField
        title="Tags"
        placeholder="tools productivity"
        info="Enter any number of tags separated by space and without the hash (#). If a tag does not exist it will be automatically created."
        {...itemProps.tags}
      />
      <Form.TextField title="Title" placeholder="Raycast - Your shortcut to everything" {...itemProps.title} />
      <Form.TextArea
        title="Description"
        placeholder="A collection of powerful productivity tools all within an extendable launcher."
        {...itemProps.description}
      />
      <Form.TextArea title="Notes" placeholder="Additional notes" {...itemProps.notes} />
      <Form.Checkbox
        label="Mark as Unread"
        info="Unread bookmarks can be filtered for, and marked as read after you had a chance to look at them."
        {...itemProps.unread}
      />
    </Form>
  );
};
