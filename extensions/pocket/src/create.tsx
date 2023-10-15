import { Action, ActionPanel, Clipboard, Form, Icon, open, popToRoot, Toast } from "@raycast/api";
import { createBookmark } from "./utils/api";
import { capitalize } from "lodash";
import { useTags } from "./utils/hooks";
import { useEffect } from "react";
import { useForm } from "@raycast/utils";
import isUrl from "is-url";

interface CreateBookmarkValues {
  url: string;
  title?: string;
  tags: string[];
}

export default function Create() {
  const tags = useTags();

  const { handleSubmit, setValue, itemProps } = useForm<CreateBookmarkValues>({
    async onSubmit(values) {
      const toast = new Toast({
        title: "Creating bookmark",
        message: values.url,
        style: Toast.Style.Animated,
      });

      toast.show();

      const bookmark = await createBookmark(values);
      toast.style = Toast.Style.Success;
      toast.title = "Bookmark created";
      toast.message = bookmark.title ?? bookmark.url;
      toast.primaryAction = {
        title: "Open in Pocket",
        shortcut: { modifiers: ["cmd", "shift"], key: "o" },
        onAction: () => {
          open(bookmark.pocketUrl);
        },
      };
      toast.secondaryAction = {
        title: "Copy Pocket URL",
        shortcut: { modifiers: ["cmd", "shift"], key: "c" },
        onAction: () => {
          Clipboard.copy(bookmark.pocketUrl);
        },
      };
      popToRoot();
    },
    validation: {
      url: (value) => {
        if (value && !isUrl(value)) {
          return "Invalid URL format";
        }
      },
    },
  });

  useEffect(() => {
    Clipboard.readText().then((text) => {
      if (text && isUrl(text)) {
        setValue("url", text);
      }
    });
  }, []);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="URL" autoFocus placeholder="https://raycast.com" {...itemProps.url} />
      <Form.TextField
        id="title"
        title="Title"
        placeholder="Raycast"
        info="If Pocket detects a title from the content of the page, this value will be ignored."
        {...itemProps.title}
      />
      <Form.TagPicker title="Tags" {...itemProps.tags}>
        {tags.map((tag) => (
          <Form.TagPicker.Item key={tag} icon={Icon.Tag} title={capitalize(tag)} value={tag} />
        ))}
      </Form.TagPicker>
    </Form>
  );
}
