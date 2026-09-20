import showdown from "showdown";
import EmailValidator from "email-validator";
import {
  Form,
  popToRoot,
  ActionPanel,
  showToast,
  Toast,
  getPreferenceValues,
  Action,
  Clipboard,
  useNavigation,
  Icon,
} from "@raycast/api";
import { type AddNote, POSTResponse } from "../types";
import { FormValidation, useForm } from "@raycast/utils";
import { API_HEADERS, API_URL } from "../constants";

type AddNoteProps = {
  onNoteAdded: () => void;
};
export default function AddNote({ onNoteAdded }: AddNoteProps) {
  const { pop } = useNavigation();
  const preferences = getPreferenceValues<Preferences.Notes>();

  const { itemProps, handleSubmit } = useForm<AddNote>({
    async onSubmit(values) {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Sending note" });
      await toast.show();

      try {
        const tags = values.tags ? values.tags.split(",") : [];
        const markdownConverter = new showdown.Converter();
        const htmlContent = markdownConverter.makeHtml(values.content);

        const relationships = values.saidBy
          ? [{ type: "customer", target: { type: "user", email: values.saidBy } }]
          : undefined;
        const response = await fetch(API_URL + "notes", {
          method: "POST",
          headers: API_HEADERS,
          body: JSON.stringify({
            data: {
              type: "textNote",
              fields: {
                name: values.title,
                content: htmlContent,
                tags: tags.map((name) => ({ name: name.trim() })).filter(({ name }) => name),
              },
              relationships,
            },
          }),
        });
        const result = (await response.json()) as POSTResponse;

        if (!response.ok) {
          throw new Error("errors" in result ? result.errors[0].detail : "Productboard rejected the note");
        }

        await Clipboard.copy(result.data.links.html);
        toast.style = Toast.Style.Success;
        toast.title = "Note created";
        toast.message = "Copied link to clipboard";
        onNoteAdded();
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed pushing note";
        toast.message = String(error);
      }

      popToRoot({ clearSearchBar: true });
    },
    initialValues: {
      tags: preferences.TAGS_DEFAULT,
      saidBy: preferences.USER_EMAIL,
    },
    validation: {
      title: FormValidation.Required,
      content: FormValidation.Required,
      saidBy(value) {
        if (value && !EmailValidator.validate(value)) return "The item is invalid";
      },
    },
  });

  return (
    <Form
      navigationTitle="Notes / Add"
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="Create Note" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Title" placeholder="Enter title" {...itemProps.title} />
      <Form.TextArea
        title="Content"
        placeholder="Enter content of the note (markdown supported)"
        {...itemProps.content}
      />
      <Form.Separator />
      <Form.TextField id="tags" title="Tags" placeholder="Enter tags (separate by comma)" />
      <Form.TextField title="Said by" placeholder="Enter valid email" {...itemProps.saidBy} />
    </Form>
  );
}
