import { writeFile } from "fs/promises";
import os from "os";
import path from "path";

import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  popToRoot,
  showInFinder,
  showToast,
  Toast,
} from "@raycast/api";
import dayjs from "dayjs";
import { format } from "prettier";
import { useRef } from "react";

import { existsFile } from "./lib/fs";
import { exportData, installedWrapper } from "./lib/tim";

const generateDefaultFileName = () => `Tim-${dayjs().format("YYYY-MM-DDTHHmmss")}`;

export default function Command() {
  const placeHolderFileName = useRef(generateDefaultFileName());

  async function handleSubmit(values: { fileName: string; directory: string }) {
    installedWrapper(async () => {
      showToast({
        title: "Exporting data…",
        style: Toast.Style.Animated,
      });

      const directory = values.directory;
      const fileName = values.fileName || generateDefaultFileName();
      const absolutePath = path.join(os.homedir(), directory, fileName + ".json");

      try {
        // Check if the file already exists
        if (
          (await existsFile(absolutePath)) &&
          (await confirmAlert({
            title: "Warning",
            message: "Do you want to override this file",
            primaryAction: {
              title: "Override",
              style: Alert.ActionStyle.Destructive,
            },
          })) === false
        ) {
          return;
        }

        const jsonString = await exportData();
        await writeFile(
          absolutePath,
          format(jsonString, {
            parser: "json-stringify",
          })
        );
        showToast({
          title: "Success",
          message: "Data has been exported",
          style: Toast.Style.Success,
        });
        await showInFinder(absolutePath);
        popToRoot();
      } catch (error) {
        showToast({
          title: "Error",
          message: "Could not export data",
          style: Toast.Style.Failure,
        });
      }
    });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Export" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="fileName"
        title="Export name"
        placeholder={placeHolderFileName.current}
        info="If empty the placeholder name will be used"
      />
      <Form.Dropdown id="directory" defaultValue="Downloads" title="Export directory" storeValue={true}>
        <Form.Dropdown.Item value="Downloads" title="Downloads" />
        <Form.Dropdown.Item value="Desktop" title="Desktop" />
        <Form.Dropdown.Item value="Documents" title="Documents" />
      </Form.Dropdown>
    </Form>
  );
}
