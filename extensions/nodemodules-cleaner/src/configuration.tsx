import { Action, ActionPanel, Form, LocalStorage } from "@raycast/api";
import { useState, useEffect } from "react";

export default function Configuration() {
  const [selectedBaseFolder, setSelectedBaseFolder] = useState<string[]>([]);
  useEffect(() => {
    LocalStorage.getItem<string>("node_modules_cleanner_base_folder").then((value) => {
      if (value) {
        setSelectedBaseFolder([value]);
      }
    });
  }, []);
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save"
            onSubmit={(values: { project: string[] }) => {
              if (values.project.length > 0) {
                LocalStorage.setItem("node_modules_cleanner_base_folder", values.project[0]);
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="project"
        canChooseDirectories
        value={selectedBaseFolder}
        title="Folder to Scan"
        allowMultipleSelection={false}
        onChange={(newValue) => {
          setSelectedBaseFolder(newValue);
        }}
      />
    </Form>
  );
}
