import { ActionPanel, Form, Action, showToast, Toast, popToRoot, closeMainWindow } from "@raycast/api";
import fs from "fs";
import { resetFolderIcon } from "./utils/resetFolderIcon";

export default function Command() {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Reset Folder Icon"
            onSubmit={async (values: { folder: string[]; image: string[] }) => {
              if (values.folder.length === 0) {
                showToast({
                  style: Toast.Style.Failure,
                  title: "Please select a folder.",
                });
                return;
              }
              const folder = values.folder[0];
              if (!fs.existsSync(folder) || !fs.lstatSync(folder).isDirectory()) {
                showToast({
                  style: Toast.Style.Failure,
                  title: "Selected folder is not valid.",
                });
                return;
              }

              await closeMainWindow({ clearRootSearch: true });
              showToast({
                style: Toast.Style.Animated,
                title: "Setting Folder Icon",
              });
              await resetFolderIcon(folder);
              await popToRoot();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="folder"
        title="Select a Folder"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
      />
    </Form>
  );
}
