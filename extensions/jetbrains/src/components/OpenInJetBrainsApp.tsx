import { AppHistory, execPromise, isWin, recentEntry, resolveLaunchTarget } from "../util";
import { popToRoot, showHUD, showToast, Toast, open, Action, captureException } from "@raycast/api";
import { basename } from "node:path";
import { stat } from "node:fs/promises";
import React from "react";
import { entryAppAction } from "../useAppHistory";

interface OpenInJetBrainsAppActionProps {
  tool: AppHistory;
  recent: recentEntry | null;
  visit: entryAppAction | null;
}

export function openInApp(
  tool: AppHistory,
  recent: recentEntry | null,
  visit: entryAppAction | null,
): () => Promise<Toast | undefined> {
  const appPath = tool.app?.path ?? "";
  async function isRunning(launchTarget: string) {
    if (isWin) {
      if (launchTarget === "") {
        return true;
      }
      const exe = basename(launchTarget);
      const { stdout } = await execPromise(`tasklist /FI "IMAGENAME eq ${exe}" /FO CSV /NH`).catch((err) => {
        captureException(err);
        return {
          stdout: "",
        };
      });
      return stdout.toLowerCase().includes(exe.toLowerCase());
    }
    if (appPath === "") {
      return true;
    }
    const grep = `ps aux | grep -v "grep" | grep "${appPath}"`;
    const { stdout } = await execPromise(grep).catch((err) => {
      captureException(err);
      return {
        stdout: "",
      };
    });
    return stdout !== "";
  }

  function sleep(seconds: number): Promise<void> {
    return new Promise(function (resolve) {
      setTimeout(resolve, seconds * 1000);
    });
  }

  async function openProject(): Promise<void> {
    if (recent === null) {
      return;
    }
    if (tool.tool) {
      await execPromise(`"${tool.tool}" "${recent.path}"`);
    } else if (tool.url) {
      // `open` shell builtin only exists on macOS — use the Raycast API so
      // protocol-url fallback also works on Windows.
      await open(`${tool.url}${recent.title}`);
    }
  }

  return async function () {
    if (appPath === "" && tool.tool === false) {
      return showToast(Toast.Style.Failure, "Failed", "No app path");
    }
    // On Windows the install location is a plain folder — resolve the actual
    // launcher exe so we don't just open the folder in File Explorer.
    const launchTarget = await resolveLaunchTarget(appPath, tool.toolName);
    const launchIsFile =
      launchTarget !== "" &&
      (!isWin ||
        (await stat(launchTarget)
          .then((stats) => stats.isFile())
          .catch(() => false)));
    let running: boolean = await isRunning(launchTarget);
    if (!running && launchIsFile) {
      /**
       * WORKAROUND FOR ENVIRONMENT PROBLEMS
       * if the app is not running open it and wait for a bit
       * using the tool directly opens with the wrong env,
       * and we need to wait so the tool actually does open
       */
      console.log("not-running");
      await showHUD(`Opening ${tool.title}`).then(() => open(launchTarget));
      let attempts = 0;
      do {
        await sleep(2);
        running = await isRunning(launchTarget);
        attempts += 1;
      } while (!running && attempts < 15);
    }
    showHUD(`Opening ${recent ? recent.title : tool.title}`)
      .then(() => visit && recent && visit(recent, tool))
      .then(() => openProject())
      .then(() => popToRoot())
      .catch((err) => showToast(Toast.Style.Failure, "Failed", err.message).then(() => captureException(err)));
  };
}

export function OpenInJetBrainsApp({ tool, recent, visit }: OpenInJetBrainsAppActionProps): React.JSX.Element | null {
  return (
    <Action
      title={`Open ${recent ? "with " : ""}${tool.title}`}
      icon={tool.icon}
      onAction={openInApp(tool, recent, visit)}
    />
  );
}
