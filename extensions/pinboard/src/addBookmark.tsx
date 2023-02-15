import { Form, ActionPanel, Action, showToast, Icon, getSelectedText, Toast, popToRoot } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { useEffect } from "react";
import { Bookmark, BookmarkFormValues } from "./types";
import { addBookmark, loadDocumentTitle } from "./api";
import { isValidURL } from "./utils";

export default function Command() {
  const { handleSubmit, itemProps, setValue, focus } = useForm<BookmarkFormValues>({
    async onSubmit(values) {
      const toast = await showToast({ title: "Pinning bookmark...", style: Toast.Style.Animated });

      try {
        await addBookmark(values as Bookmark);
        toast.style = Toast.Style.Success;
        toast.title = "Successfully added bookmark";
        popToRoot();
      } catch (error) {
        console.error("addBookmark error", error);
        toast.title = "Could not pin bookmark";
        toast.message = String(error);
        toast.style = Toast.Style.Failure;
      }
    },
    validation: {
      url: (value) => {
        if (value?.length === 0) {
          return "The item is required";
        } else if (value && !isValidURL(value)) {
          return "Enter a valid URL";
        }
      },
      title: FormValidation.Required,
    },
    initialValues: {},
  });

  useEffect(() => {
    (async () => {
      try {
        const selectedText = await getSelectedText();
        console.log("selectedText", selectedText);
        if (!isValidURL(selectedText)) {
          console.log(selectedText, "is not a valid URL");
          return;
        }
        setValue("url", selectedText);
        try {
          const documentTitle = await loadDocumentTitle(selectedText);
          if (documentTitle) {
            setValue("title", documentTitle);
            focus("tags");
          } else {
            focus("title");
          }
        } catch (error) {
          console.error("Could not load document title", error);
          focus("title");
        }
      } catch (error) {
        console.error("Could not get selected text", error);
      }
    })();
  }, []);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Bookmark" icon={{ source: Icon.Plus }} onSubmit={handleSubmit} />
          <Action.OpenInBrowser title="Open Pinboard" url="https://pinboard.in" />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="URL"
        placeholder="Enter URL (Tip: Select a URL before opening this form)"
        {...itemProps.url}
      />
      <Form.TextField title="Title" placeholder="Enter title" {...itemProps.title} />
      <Form.Separator />
      <Form.TextField title="Tags" placeholder="Enter tags (comma separated)" {...itemProps.tags} />
      <Form.Checkbox title="" label="Private" storeValue {...itemProps.private} />
      <Form.Checkbox title="" label="Read Later" storeValue {...itemProps.readLater} />
    </Form>
  );
}
