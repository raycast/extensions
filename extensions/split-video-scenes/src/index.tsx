import {
  Action,
  ActionPanel,
  closeMainWindow,
  Detail,
  Form,
  getSelectedFinderItems,
  Icon,
  showToast,
  Toast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { ChildProcess, ChildProcessWithoutNullStreams, exec, execSync } from "child_process";
import os from "os";
import path from "path";
import { useState } from "react";

function getUserShellPath() {
  const shell = os.userInfo().shell || "/bin/sh";
  const command = `${shell} -l -i -c 'echo $PATH'`;

  try {
    const path = execSync(command).toString().trim();
    return path;
  } catch (error) {
    console.error("Error retrieving shell PATH:", error);
    return process.env.PATH || "";
  }
}

process.env.PATH = getUserShellPath();

import { Alert, confirmAlert } from "@raycast/api";

function isCommandInstalled(command: string) {
  try {
    execSync(`which ${command}`);
    return true;
  } catch {
    return false;
  }
}

let childProcess: ChildProcess | null = null;

export default function Command() {
  const [logs, setLogs] = useState("");
  const [detectionMethod, setDetectionMethod] = useState("detect-content");
  const finderItems = usePromise(() => getSelectedFinderItems(), [], {
    onData(data) {
      const els = data?.map((item) => item.path) || [];
      if (els.length > 0) {
        setFilePaths(els);
      }
    },
  });

  async function handleSubmit() {
    if (!filePaths || filePaths.length === 0) {
      showToast({ style: Toast.Style.Failure, title: "No file selected", message: "Please select a video file first" });
      return;
    }

    if (!isCommandInstalled("scenedetect")) {
      const options: Alert.Options = {
        title: "scenedetect command not found",
        message: "The command 'scenedetect' is not installed. Do you want to install it with pip now?",
        primaryAction: {
          title: "Install",
          onAction: async () => {
            const installCommand = "pip install scenedetect[opencv] --upgrade";
            console.log(`Executing install command: ${installCommand}`);
            setLogs((prevLogs) => `Executing install command: ${installCommand}\n${prevLogs}`);

            if (childProcess) {
              childProcess.kill();
            }
            childProcess = exec(installCommand, {
              env: { ...process.env },
            });

            childProcess.stdout?.on("data", (data) => {
              if (childProcess?.killed) {
                return;
              }
              console.error(data.toString());
              setLogs((prevLogs) => `${data.toString()}\n${prevLogs}`);
            });

            childProcess.stderr?.on("data", (data) => {
              if (childProcess?.killed) {
                return;
              }
              console.error(data.toString());
              setLogs((prevLogs) => `${data.toString()}\n${prevLogs}`);
            });

            const exitCode = await new Promise((resolve) => childProcess!.on("exit", (code) => resolve(code || 0)));

            if (exitCode === 0) {
              setLogs("");
            } else {
              showToast({ style: Toast.Style.Failure, title: "Error", message: "Failed to install command" });
            }
          },
        },
        dismissAction: {
          title: "Cancel",
        },
      };
      await confirmAlert(options);
      return;
    }

    let exitCode = 0;
    for (const videoPath of filePaths) {
      const outputDir = path.join(path.dirname(videoPath), path.basename(videoPath, path.extname(videoPath)));

      let command = `scenedetect -i "${videoPath}" -o "${outputDir}" ${detectionMethod} split-video`;

      console.log(`Executing command: ${command}`);
      setLogs((prevLogs) => `Executing command: ${command}\n${prevLogs}`);

      childProcess = exec(command, {
        env: { ...process.env },
      });

      childProcess.stdout?.on("data", (data) => {
        if (childProcess?.killed) {
          return;
        }
        console.error(data.toString());
        setLogs((prevLogs) => `${data.toString()}\n${prevLogs}`);
      });

      childProcess.stderr?.on("data", (data) => {
        if (childProcess?.killed) {
          return;
        }
        console.error(data.toString());
        setLogs((prevLogs) => `${data.toString()}\n${prevLogs}`);
      });
      exitCode = await new Promise((resolve) => childProcess!.on("exit", (code) => resolve(code || 0)));
    }
    if (exitCode === 0) {
      closeMainWindow();
    }
  }

  const [filePaths, setFilePaths] = useState(finderItems?.data?.map((x) => x.path) || []);

  async function handleCancel() {
    if (!childProcess) {
      return;
    }
    childProcess.kill();
    await new Promise((resolve) => childProcess!.on("exit", (code) => resolve(code || 0)));
    setLogs("");
  }

  if (logs && filePaths.length > 0) {
    return (
      <Detail
        actions={
          <ActionPanel>
            <Action icon={Icon.Trash} title="Cancel" onAction={handleCancel} />
          </ActionPanel>
        }
        isLoading={true}
        navigationTitle="logs"
        key="markdown logs"
        markdown={"```\n" + logs + "\n```"}
      />
    );
  }

  return (
    <Form
      isLoading={finderItems.isLoading}
      searchBarAccessory={
        <Form.LinkAccessory target="https://github.com/sponsors/remorses" text="Sponsor Extension Creator" />
      }
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Split Video Into Scenes" />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="file"
        canChooseDirectories={false}
        canChooseFiles={true}
        autoFocus
        title="Select video files"
        value={filePaths}
        onChange={setFilePaths}
      />
      <Form.Dropdown
        id="detectionMethod"
        title="Detection Method"
        value={detectionMethod}
        onChange={setDetectionMethod}
      >
        <Form.Dropdown.Item value="detect-content" title="Content Detection" />
        <Form.Dropdown.Item value="detect-threshold" title="Threshold Detection" />
        <Form.Dropdown.Item value="detect-adaptive" title="Adaptive Detection" />
      </Form.Dropdown>
    </Form>
  );
}
