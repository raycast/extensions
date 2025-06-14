import { ActionPanel, Form, Action, useNavigation } from "@raycast/api";
import { Notebook, Source } from "../types";
import { NotebookService } from "../services";

export function EditNotebookTitle(props: { notebookService: NotebookService; notebook: Notebook }) {
  const { notebookService, notebook } = props;
  const { pop } = useNavigation();

  return (
    <Form
      navigationTitle={"Edit Notebook Title"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save"
            onSubmit={async (values) => {
              pop();
              await notebookService.editNotebookTitle(notebook.id, values.title);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea id="title" title="Notebook Title" defaultValue={notebook.title} />
    </Form>
  );
}

export function EditSourceTitle(props: { notebookService: NotebookService; source: Source }) {
  const { notebookService, source } = props;
  const { pop } = useNavigation();

  return (
    <Form
      navigationTitle={"Edit Source Title"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save"
            onSubmit={async (values) => {
              pop();
              await notebookService.editSourceTitle(source.id, values.title);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea id="title" title="Source Title" defaultValue={source.title} />
    </Form>
  );
}
