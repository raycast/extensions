import { Action, ActionPanel, Form, getPreferenceValues, Icon } from "@raycast/api";
import React, { useState } from "react";
import { uploadImage } from "./utils/axios-utils";
import { ActionOpenExtensionPreferences } from "./components/action-open-extension-preferences";
import { ActionToSmMs } from "./components/action-to-sm-ms";
import { Preferences } from "./types/preferences";

export default function UploadImages() {
  const { uploadMode } = getPreferenceValues<Preferences>();
  //upload mode: true=path upload, false=url upload
  const [curMode, setCurMode] = useState<boolean>(uploadMode === "true");
  const [imagePaths, setImagePaths] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [imagePathError, setImagePathError] = useState<string | undefined>();
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
              uploadImage(curMode ? imagePaths[0] : imageUrl, setImagePathError).then((value) => {
                if (typeof value !== "undefined") {
                  if (value.success) {
                    const _uploadedImage = [...uploadedImage];
                    _uploadedImage.unshift(value.message);
                    setUploadedImage(_uploadedImage);
                    setImagePaths([]);
                  }
                }
              });
            }}
          />
          <Action.CopyToClipboard
            title={"Copy All Image URL"}
            shortcut={{ modifiers: ["shift", "cmd"], key: "," }}
            content={uploadedImage.join("\n")}
          />
          <ActionPanel.Section>
            <Action
              icon={Icon.Repeat}
              title={curMode ? "Switch to URL Upload" : "Switch to Path Upload"}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={() => {
                setCurMode(!curMode);
              }}
            />
          </ActionPanel.Section>
          <ActionToSmMs />
          <ActionOpenExtensionPreferences />
        </ActionPanel>
      }
    >
      {curMode && (
        <Form.FilePicker
          id={"ImagePath"}
          title={"Image"}
          value={imagePaths}
          error={imagePathError}
          info={`⌘+R to switch to ${curMode ? "URL" : "Path"} upload`}
          allowMultipleSelection={false}
          canChooseDirectories={false}
          onChange={(newValue) => {
            setImagePaths(newValue);
            if (newValue.length > 0) {
              setImagePathError(undefined);
            }
          }}
        />
      )}

      {!curMode && (
        <Form.TextField
          id={"ImageURL"}
          title={"Image"}
          value={imageUrl}
          error={imagePathError}
          info={`⌘+R to switch to ${curMode ? "URL" : "Path"} upload`}
          onChange={(newValue) => {
            setImageUrl(newValue);
            if (newValue.length > 0) {
              setImagePathError(undefined);
            }
          }}
          placeholder={"Image URL"}
        />
      )}
      {uploadedImage.map((value, index, array) => {
        return <Form.Description key={index} title={"Uploaded " + (array.length - index)} text={value} />;
      })}
    </Form>
  );
}
