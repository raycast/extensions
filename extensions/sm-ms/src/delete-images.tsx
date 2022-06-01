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
                showToast(Style.Failure, "Hash cannot be empty!").then();
                return;
              }
              alertDialog(
                Icon.Trash,
                "Delete Image",
                `Are you sure you want to delete this image?`,
                "Delete Image",
                async () => {
                  await showToast(Style.Animated, `Deleting image...`);
                  await deleteImageByHash(hash);
                  setHash("");
                }
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
        onChange={setHash}
        placeholder={"Image hash"}
      ></Form.TextField>
    </Form>
  );
}
