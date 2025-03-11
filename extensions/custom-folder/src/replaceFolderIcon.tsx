import { ActionPanel, Form, Action, showToast, Toast, popToRoot, closeMainWindow } from "@raycast/api";
import fs from "fs";
import path from "path";
import { replaceFolderIcon } from "./utils/replaceFolderIcon";

export default function Command() {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Set Folder Icon"
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

              if (values.image.length === 0) {
                showToast({
                  style: Toast.Style.Failure,
                  title: "Please select an image file.",
                });
                return;
              }
              const file = values.image[0];
              const allowedExtensions = [".png", ".jpg", ".jpeg"];

              if (!fs.existsSync(file) || fs.lstatSync(file).isDirectory()) {
                showToast({
                  style: Toast.Style.Failure,
                  title: "Selected file is not valid.",
                });
                return;
              }

              const fileExtension = path.extname(file).toLowerCase();
              if (!allowedExtensions.includes(fileExtension)) {
                showToast({
                  style: Toast.Style.Failure,
                  title: "Images must be in one of the following formats: .png, .jpg, .jpeg",
                });
                return;
              }

              await closeMainWindow({ clearRootSearch: true });
              showToast({
                style: Toast.Style.Animated,
                title: "Setting Folder Icon",
              });
              await replaceFolderIcon(folder, file);
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
      <Form.FilePicker
        id="image"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        canChooseFiles
        title="Select an Image"
      />
    </Form>
  );
}
