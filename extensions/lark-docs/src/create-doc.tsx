import {
  Action,
  ActionPanel,
  Form,
  Icon,
  Toast,
  closeMainWindow,
  open,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { withAuth } from "./features/with-auth";
import { withQuery } from "./features/query-provider";
import { getErrorMessage } from "./services/client";
import { createDocument, CreateType } from "./services/docs";

function CreateDocForm() {
  const handleSubmit = async (values: Form.Values) => {
    const type = (values.type as CreateType) || CreateType.Docx;
    const title = String(values.title || "").trim();
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Creating ${labelForType(type)}...`,
    });

    try {
      const created = await createDocument(type, title);
      toast.style = Toast.Style.Success;
      toast.title = `${labelForType(type)} created`;
      toast.message = created.title;
      await closeMainWindow();
      await open(created.url);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = `Could Not Create ${labelForType(type)}`;
      toast.message = getErrorMessage(error);
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create and Open" icon={Icon.Plus} onSubmit={handleSubmit} />
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    >
      <Form.Description text="The new file will be created in My Documents and opened in your default browser." />
      <Form.Dropdown id="type" title="File Type" defaultValue={CreateType.Docx}>
        <Form.Dropdown.Item value={CreateType.Docx} title="Document" icon={Icon.Document} />
        <Form.Dropdown.Item value={CreateType.Sheet} title="Spreadsheet" icon={Icon.BarChart} />
        <Form.Dropdown.Item value={CreateType.Slides} title="Slides" icon={Icon.Desktop} />
      </Form.Dropdown>
      <Form.TextField
        id="title"
        title="Title"
        placeholder="Untitled"
        info="Optional. You can also rename the file after it opens."
      />
    </Form>
  );
}

function labelForType(type: CreateType): string {
  switch (type) {
    case CreateType.Sheet:
      return "Spreadsheet";
    case CreateType.Slides:
      return "Slides";
    default:
      return "Document";
  }
}

export default withAuth(withQuery(CreateDocForm));
