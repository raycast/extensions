import fs from "node:fs";
import path from "node:path";
import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { addCustomProjectPath, setActiveProjectPath } from "../lib/storage";

interface AddProjectFormProps {
  onAdded?: () => unknown;
}

export function AddProjectForm({ onAdded }: AddProjectFormProps) {
  const { pop } = useNavigation();
  const [folders, setFolders] = useState<string[]>([]);
  const [setActive, setSetActive] = useState(true);
  const [folderError, setFolderError] = useState<string | undefined>();

  async function handleSubmit() {
    const selected = folders[0];
    if (!selected) {
      setFolderError("Please select a project folder.");
      return;
    }

    const pkgJson = path.join(selected, "package.json");
    if (!fs.existsSync(pkgJson)) {
      setFolderError("Selected directory does not contain a package.json file.");
      return;
    }

    await addCustomProjectPath(selected);
    if (setActive) {
      await setActiveProjectPath(selected);
    }

    await showToast({
      style: Toast.Style.Success,
      title: "Project added",
      message: path.basename(selected),
    });

    await onAdded?.();
    pop();
  }

  return (
    <Form
      navigationTitle="Add Local Project"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Project" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="folder"
        title="Project Directory"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
        value={folders}
        error={folderError}
        onChange={(next) => {
          setFolderError(undefined);
          setFolders(next);
        }}
      />
      <Form.Checkbox
        id="setActive"
        label="Set as active project immediately"
        value={setActive}
        onChange={setSetActive}
      />
      <Form.Description
        title="Tip"
        text="You can also configure automatic discovery folders under Packdeck extension preferences (Project Directories)."
      />
    </Form>
  );
}
