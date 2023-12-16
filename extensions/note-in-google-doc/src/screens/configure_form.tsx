import { Action, Icon, ActionPanel, Form } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { GoogleDoc } from "../google_fns";
import { getOriginalNoteName } from "../util";
import { CreateNewFileForm } from "./create_new_file";

export function ConfigureForm() {
  const [defaultDoc, setDefaultDoc] = useCachedState<GoogleDoc>("default-doc");
  const [, setCurrentDoc] = useCachedState<GoogleDoc | undefined>("current-doc");
  const [raycastFiles] = useCachedState<Array<GoogleDoc>>("raycast-notes-files", []);

  function CreateNewFileAction() {
    return <Action.Push icon={Icon.NewDocument} title="Create New File" target={<CreateNewFileForm />} />;
  }

  function ChangeDefaultFileAction() {
    return (
      raycastFiles && (
        <ActionPanel.Section title="Change Default File">
          {raycastFiles.map((file) => {
            const isDefault = file.name === defaultDoc?.name;
            const title = getOriginalNoteName(file.name) + (isDefault ? " (Default)" : "");
            return (
              <Action
                title={title}
                key={file.id}
                onAction={() => {
                  setDefaultDoc(file);
                  setCurrentDoc(file);
                }}
              />
            );
          })}
        </ActionPanel.Section>
      )
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <CreateNewFileAction />
          <ChangeDefaultFileAction />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="notes-files"
        value={defaultDoc?.id}
        title="Default Notes Location"
        onChange={(newValue: string) => {
          const doc = raycastFiles?.find((file) => file.id === newValue);
          setDefaultDoc(doc);
          setCurrentDoc(doc);
        }}
      >
        {raycastFiles &&
          raycastFiles.map((file) => {
            const isDefault = file.id === defaultDoc?.id;
            const title = getOriginalNoteName(file.name) + (isDefault ? " (Default)" : "");
            return <Form.Dropdown.Item value={file.id} title={title} key={file.id}></Form.Dropdown.Item>;
          })}
      </Form.Dropdown>
    </Form>
  );
}
