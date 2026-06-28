import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { useAddContainingDirectory } from "../configApi";

export function NewContainingDirectory() {
  const navigation = useNavigation();
  const addContainingDirectory = useAddContainingDirectory();

  return (
    <Form
      navigationTitle="New Containing Directory"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Submit"
            onSubmit={async ({ dir: [dir] }: { dir: [string] }) => {
              addContainingDirectory(dir);
              navigation.pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Select a Containing Directory"
        text="Select a directory to add to the list of containing directories. This is a directory that contains your projects (e.g. `~/Code`)."
      />
      <Form.FilePicker
        id="dir"
        title="Directory"
        allowMultipleSelection={false}
        canChooseDirectories={true}
        canChooseFiles={false}
      />
    </Form>
  );
}
