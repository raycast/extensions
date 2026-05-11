import { Form, ActionPanel, Action, getPreferenceValues, LaunchProps } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { CreateFormValues, createSlidesFile } from "./slides";

const preferences = getPreferenceValues<Preferences>();

const MARP_DOCS = "https://github.com/marp-team/marp-core/tree/main/themes";
export default function Command(props: LaunchProps<{ draftValues: CreateFormValues }>) {
  const { draftValues } = props;

  const { handleSubmit, itemProps } = useForm<CreateFormValues>({
    onSubmit: createSlidesFile,
    initialValues: draftValues,
    validation: {
      title: FormValidation.Required,
    },
  });

  return (
    <Form
      enableDrafts
      searchBarAccessory={<Form.LinkAccessory target={MARP_DOCS} text="Marp Theming Documentation" />}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create File" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Create a new markdown slides presentation" />
      <Form.TextField title="Title" placeholder="Enter presentation title" {...itemProps.title} />
      <Form.TextArea
        title="Content"
        placeholder="Enter content"
        info={
          "Pages are separated by " +
          (preferences.pageSeparator === "ruler" ? "horizontal rule (---)" : "three line breaks")
        }
        {...itemProps.content}
      />
      <Form.Separator />
      <Form.Description title="Export Options" text="Used when generating a printable HTML presentation" />
      <Form.Dropdown
        title="Theme"
        info="Choose a built-in theme for the exported presentation. Check the linked documentation above for more information and styling options."
        {...itemProps.theme}
      >
        <Form.Dropdown.Item value="default" title="Default" />
        <Form.Dropdown.Item value="gaia" title="Gaia" />
        <Form.Dropdown.Item value="uncover" title="Uncover" />
      </Form.Dropdown>
      <Form.Checkbox title="Paginate" label="Show page numbers in the exported presentation" {...itemProps.paginate} />
      <Form.Description text="Your selection will be stored in the Markdown front matter and can easily be updated by editing the file" />
    </Form>
  );
}
