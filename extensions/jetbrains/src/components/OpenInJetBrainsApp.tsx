import { AppHistory, execPromise, recentEntry } from "../util";
import { popToRoot, showHUD, showToast, Toast, open, Action, captureException } from "@raycast/api";
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
  visit: entryAppAction | null
): () => Promise<Toast | undefined> {
  const cmd = tool.tool ? `"${tool.tool}" "${recent?.path ?? ""}"` : `open ${tool.url}${recent?.title ?? ""}`;
  const toOpen = tool.app?.path ?? "";
  async function isRunning() {
    const grep = `ps aux | grep -v "grep" | grep "${tool.app?.path}"`;
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

  return async function () {
    if (toOpen === "" && tool.tool === false) {
      return showToast(Toast.Style.Failure, "Failed", "No app path");
    }
    let running: boolean = await isRunning();
    if (!running) {
      if (toOpen === "") {
        return showToast(Toast.Style.Failure, "Failed", "No app path");
      }
      /**
       * WORKAROUND FOR ENVIRONMENT PROBLEMS
       * if the app is not running open it and wait for a bit
       * using the tool directly opens with the wrong env,
       * and we need to wait so the tool actually does open
       */
      console.log("not-running");
      await showHUD(`Opening ${tool.title}`).then(() => open(toOpen));
      do {
        await sleep(2);
        running = await isRunning();
      } while (!running);
    }
    showHUD(`Opening ${recent ? recent.title : tool.title}`)
      .then(() => visit && recent && visit(recent, tool))
      .then(() => recent !== null && execPromise(cmd) && null)
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
