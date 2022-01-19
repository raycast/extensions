import got from "got";
import showdown from "showdown";
import EmailValidator from "email-validator";
import {
  Form,
  popToRoot,
  ActionPanel,
  copyTextToClipboard,
  SubmitFormAction,
  showToast,
  Toast,
  ToastStyle,
  getPreferenceValues,
} from "@raycast/api";
import { Note, Preferences } from "./types";

export default function Command() {
  const preferences: Preferences = getPreferenceValues();

  async function handleSubmit(values: Note) {
    if (values.saidBy !== "" && EmailValidator.validate(values.saidBy) === false) {
      await showToast(ToastStyle.Failure, "Email format is not valid");
    } else if (values.title === "") {
      await showToast(ToastStyle.Failure, "Title is required");
    } else if (values.content === "") {
      await showToast(ToastStyle.Failure, "Content is required");
    } else {
      const toast = new Toast({ style: ToastStyle.Animated, title: "Sending note" });
      await toast.show();

      try {
        const tags = values.tags ? values.tags.split(",") : [];
        const markdownConverter = new showdown.Converter();
        const htmlContent = markdownConverter.makeHtml(values.content);

        const { body } = await got.post("https://api.productboard.com/notes", {
          json: {
            title: values.title,
            content: htmlContent,
            customer_email: values.saidBy,
            tags: tags,
          },
          headers: {
            Authorization: "Bearer " + preferences.PUBLIC_API_TOKEN,
          },
          responseType: "json",
        });

        await copyTextToClipboard((body as any).links.html);
        toast.style = ToastStyle.Success;
        toast.title = "Note created";
        toast.message = "Copied link to clipboard";
      } catch (error) {
        toast.style = ToastStyle.Failure;
        toast.title = "Failed pushing note";
        toast.message = String(error);
      }

      popToRoot({ clearSearchBar: true });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <SubmitFormAction title="Create Note" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" placeholder="Enter title" />
      <Form.TextArea id="content" title="Content" placeholder="Enter content of the note (markdown supported)" />
      <Form.Separator />
      <Form.TextField
        id="tags"
        title="Tags"
        placeholder="Enter tags (separate by comma)"
        defaultValue={preferences.TAGS_DEFAULT}
      />
      <Form.TextField
        id="saidBy"
        title="Said by"
        placeholder="Enter valid email"
        defaultValue={preferences.USER_EMAIL}
      />
    </Form>
  );
}
