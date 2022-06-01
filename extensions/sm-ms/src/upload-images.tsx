import { Action, ActionPanel, Form, Icon, open, showToast, Toast } from "@raycast/api";
import React, { useState } from "react";
import { chooseFile } from "./utils/applescript-utils";
import { uploadImage } from "./utils/axios-utils";
import { ActionOpenExtensionPreferences } from "./components/action-open-extension-preferences";
import { ActionToSmMs } from "./components/action-to-sm-ms";

export default function UploadImages() {
  const [imagePath, setImagePath] = useState<string>("");

  return (
    <Form
      actions={
        <ActionPanel>
          <Action
            icon={Icon.Upload}
            title={"Upload Image"}
            shortcut={{ modifiers: ["cmd"], key: "u" }}
            onAction={() => {
              uploadImage(imagePath).then(() => {
                setImagePath("");
              });
            }}
          />
          <Action
            title={"Choose Image"}
            icon={Icon.Sidebar}
            shortcut={{ modifiers: ["shift", "ctrl"], key: "c" }}
            onAction={() => {
              chooseFile().then((path) => {
                open("raycast://").then();
                setImagePath(path);
              });
            }}
          />
          <ActionToSmMs />
          <ActionOpenExtensionPreferences />
        </ActionPanel>
      }
    >
      <Form.TextField
        id={"Image"}
        title={"Image"}
        value={imagePath}
        onChange={setImagePath}
        placeholder={"Path, URL"}
      ></Form.TextField>
    </Form>
  );
}
