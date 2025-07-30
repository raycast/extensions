import { Action, ActionPanel, Clipboard, Form, Icon, open, popToRoot, showToast, Toast } from "@raycast/api";
import { useEffect } from "react";
import { useForm } from "@raycast/utils";
import isUrl from "is-url";
import { usePocketClient, View } from "./lib/oauth/view";
import { useTags } from "./lib/hooks/use-tags";
import { titleCase } from "./lib/utils";

interface CreateBookmarkValues {
  url: string;
  title?: string;
  tags: string[];
}

function CreateBookmark() {
  const pocket = usePocketClient();
  const { tags } = useTags();

  const { handleSubmit, setValue, itemProps } = useForm<CreateBookmarkValues>({
    async onSubmit(values) {
      const toast = await showToast({
        title: "Creating bookmark",
        message: values.url,
        style: Toast.Style.Animated,
      });

      const bookmark = await pocket.createBookmark(values);

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

      await popToRoot();
    },
    validation: {
      url: (value) => {
        if (!value) return "URL isrequired";
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
        title="Title"
        placeholder="Raycast"
        info="If Pocket detects a title from the content of the page, this value will be ignored."
        {...itemProps.title}
      />
      <Form.TagPicker title="Tags" {...itemProps.tags}>
        {tags.map((tag) => (
          <Form.TagPicker.Item key={tag} icon={Icon.Tag} title={titleCase(tag)} value={tag} />
        ))}
      </Form.TagPicker>
    </Form>
  );
}

export default function Command() {
  return (
    <View>
      <CreateBookmark />
    </View>
  );
}
