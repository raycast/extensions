import { Action, ActionPanel, Form, Icon, showToast, Toast } from "@raycast/api";
import React, { useState } from "react";
import { alertDialog } from "./components/dialog";
import { deleteImageByHash } from "./utils/axios-utils";
import Style = Toast.Style;
import { ActionToSmMs } from "./components/action-to-sm-ms";
import { ActionOpenExtensionPreferences } from "./components/action-open-extension-preferences";
import { isEmpty } from "./utils/common-utils";

export default function DeleteImages() {
  const [hash, setHash] = useState<string>("");
  const [hashError, setHashError] = useState<string | undefined>();
  const [deletedImage, setDeletedImage] = useState<string[]>([]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action
            icon={Icon.Trash}
            title={"Delete Image"}
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
            onAction={() => {
              if (isEmpty(hash)) {
                setHashError("The field should't be empty!");
                return;
              }
              alertDialog(
                Icon.Trash,
                "Delete Image",
                `Are you sure you want to delete this image?`,
                "Delete Image",
                async () => {
                  await showToast(Style.Animated, `Deleting image...`);
                  const result = await deleteImageByHash(hash);
                  if (result.success) {
                    const _deletedImage = [...deletedImage];
                    _deletedImage.unshift(hash);
                    setDeletedImage(_deletedImage);
                  }
                  setHash("");
                },
              ).then();
            }}
          />
          <ActionToSmMs />
          <ActionOpenExtensionPreferences />
        </ActionPanel>
      }
    >
      <Form.TextField
        id={"Hash"}
        title={"Hash"}
        value={hash}
        error={hashError}
        onChange={(newValue) => {
          setHash(newValue);
          if (newValue.length > 0) {
            setHashError(undefined);
          }
        }}
        placeholder={"Image hash"}
      />

      {deletedImage.map((value, index, array) => {
        return <Form.Description title={array.length - index + ""} text={value} />;
      })}
    </Form>
  );
}
