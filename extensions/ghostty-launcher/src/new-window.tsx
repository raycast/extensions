import {
  ActionPanel,
  Action,
  Form,
  showToast,
  Toast,
  getSelectedFinderItems,
  showHUD,
  popToRoot,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { exec } from "child_process";
import { homedir } from "os";
import path from "path";
import fs from "fs";

export default function Command() {
  const [directory, setDirectory] = useState<string>("");
  const [finderPath, setFinderPath] = useState<string | null>(null);

  useEffect(() => {
    getSelectedFinderItems()
      .then((items) => {
        if (items.length > 0) {
          const item = items[0];
          if (
            fs.existsSync(item.path) &&
            fs.statSync(item.path).isDirectory()
          ) {
            setFinderPath(item.path);
          } else {
            setFinderPath(path.dirname(item.path));
          }
        }
      })
      .catch(() => {});
  }, []);

  const openGhostty = async (dir?: string) => {
    const targetDir = dir?.replace(/^~/, homedir()) || homedir();

    if (!fs.existsSync(targetDir)) {
      showToast({
        style: Toast.Style.Failure,
        title: "Directory not found",
        message: targetDir,
      });
      return;
    }

    try {
      exec(`open -a Ghostty "${targetDir}"`, (error) => {
        if (error) {
          showToast({
            style: Toast.Style.Failure,
            title: "Failed to open Ghostty",
            message: error.message,
          });
        }
      });

      await showHUD(`Opening Ghostty in ${path.basename(targetDir)}`);
      await popToRoot();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to open Ghostty",
        message: String(error),
      });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Open in Ghostty"
            onSubmit={(values) => openGhostty(values.directory || undefined)}
          />
          {finderPath && (
            <Action
              title={`Open ${path.basename(finderPath)}`}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
              onAction={() => openGhostty(finderPath)}
            />
          )}
          <Action
            title="Open Home Directory"
            shortcut={{ modifiers: ["cmd"], key: "h" }}
            onAction={() => openGhostty()}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="directory"
        title="Directory"
        placeholder="Enter path (leave empty for home ~)"
        value={directory}
        onChange={setDirectory}
      />
      {finderPath && (
        <Form.Description
          title="Finder Selection"
          text={`⌘F to open: ${finderPath.replace(homedir(), "~")}`}
        />
      )}
    </Form>
  );
}
