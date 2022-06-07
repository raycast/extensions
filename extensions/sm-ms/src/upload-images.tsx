import { Action, ActionPanel, Form, Icon, open, showToast, Toast } from "@raycast/api";
import React, { useState } from "react";
import { chooseFile } from "./utils/applescript-utils";
import { uploadImage } from "./utils/axios-utils";
import { ActionOpenExtensionPreferences } from "./components/action-open-extension-preferences";
import { ActionToSmMs } from "./components/action-to-sm-ms";

export default function UploadImages() {
  const [imagePath, setImagePath] = useState<string>("");
  const [uploadedImage, setUploadedImage] = useState<string[]>([]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action
            icon={Icon.Upload}
            title={"Upload Image"}
            shortcut={{ modifiers: ["cmd"], key: "u" }}
            onAction={() => {
              uploadImage(imagePath).then((value) => {
                if (typeof value !== "undefined") {
                  if (value.success) {
                    const _uploadedImage = [...uploadedImage];
                    _uploadedImage.unshift(value.message);
                    setUploadedImage(_uploadedImage);
                  }
                }
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
          <Action.CopyToClipboard
            title={"Copy All Image URL"}
            shortcut={{ modifiers: ["shift", "cmd"], key: "," }}
            content={uploadedImage.join("\n")}
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
        placeholder={"Path (⌘+⇧+↩) or URL"}
      />
      {uploadedImage.map((value, index, array) => {
        return <Form.Description title={array.length - index + ""} text={value} />;
      })}
    </Form>
  );
}
