import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { strings } from "./lib/strings";

type Values = { paths?: string[] };

/** File and folder picker: everything picked here is referenced by its path, nothing is copied. */
export function AddItemsForm({
  onAdd,
}: {
  onAdd: (paths: string[]) => Promise<void>;
}) {
  const { pop } = useNavigation();

  return (
    <Form
      navigationTitle={strings.addItemsTitle}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={strings.addItemsSubmit}
            onSubmit={async (values: Values) => {
              const paths = values.paths ?? [];
              if (paths.length === 0) return;
              await onAdd(paths);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="paths"
        title={strings.addItemsPath}
        info={strings.addItemsHint}
        allowMultipleSelection
        canChooseDirectories
        canChooseFiles
        autoFocus
      />
    </Form>
  );
}
