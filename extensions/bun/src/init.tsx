import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

import { useState } from "react";
import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { join as joinPaths } from "node:path";

import { shellEnv } from "./constants";
import { open } from "./utils";

export default function Command() {
  const [paths, setPaths] = useState<string[]>([]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Init Project"
            onSubmit={async ({
              name,
              entrypoint,
              paths,
              autoOpen,
            }: {
              name: string;
              entrypoint: string;
              paths: [string];
              autoOpen: boolean;
            }) => {
              const path = paths[0];

              await writeFile(
                joinPaths(path, "package.json"),
                JSON.stringify(
                  {
                    name,
                    module: entrypoint,
                  },
                  null,
                  2,
                ),
              );

              const bunInit = spawn("bun", ["init"], {
                env: shellEnv,
                cwd: path,
              });
              let expectedToBeKilled = false;

              bunInit.on("error", (error) => {
                showFailureToast(error, {
                  title: `Error spawning \`bun init\``,
                });
              });

              bunInit.on("exit", (code) => {
                if (code == 0) {
                  showToast({
                    style: Toast.Style.Success,
                    title: "Initialized project",
                    primaryAction: {
                      title: "Open",
                      shortcut: { modifiers: ["cmd"], key: "enter" },
                      onAction() {
                        open(path);
                      },
                    },
                  });

                  if (autoOpen) {
                    open(path);
                  }
                } else if (code === null) {
                  if (!expectedToBeKilled) {
                    showToast({
                      style: Toast.Style.Failure,
                      title: "Process `bun init` was killed",
                    });
                  }
                } else {
                  showToast({
                    title: `Process \`bun init\` exited with code ${code}`,
                    style: Toast.Style.Failure,
                  });
                }
              });

              await showToast({
                title: "Initializing project",
                style: Toast.Style.Animated,
                primaryAction: {
                  title: "Cancel",
                  shortcut: {
                    modifiers: ["ctrl"],
                    key: "c",
                  },
                  onAction(toast) {
                    expectedToBeKilled = true;

                    toast.style = Toast.Style.Failure;
                    if (bunInit.kill("SIGINT")) {
                      toast.title = "Cancelled";
                    } else {
                      toast.title = "Failed to cancel";
                    }
                  },
                },
              });
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Package name" />
      <Form.TextField id="entrypoint" title="Entrypoint" storeValue defaultValue="index.ts" />
      <Form.FilePicker
        id="paths"
        title="Parent directory"
        allowMultipleSelection={false}
        canChooseDirectories
        storeValue
        onChange={setPaths}
      />
      <Form.Description title="Destination" text={paths.length ? joinPaths(paths[0], "package.json") : ""} />

      <Form.Separator />

      <Form.Checkbox id="autoOpen" label="Automatically open project when created" storeValue />
    </Form>
  );
}
