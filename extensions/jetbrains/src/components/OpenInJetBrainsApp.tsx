import { exec } from "child_process";
import { AppHistory, recentEntry } from "../util";
import { ActionPanel, popToRoot, showHUD, showToast, Toast, open } from "@raycast/api";
import { promisify } from "util";

const execPromise = promisify(exec);

interface OpenInJetBrainsAppActionProps {
  tool: AppHistory;
  recent: recentEntry | null;
}

export function openInApp(tool: AppHistory, recent: recentEntry | null): () => Promise<Toast | undefined> {
  const cmd = tool.tool ? `"${tool.tool}" "${recent?.path ?? ""}"` : `open ${tool.url}${recent?.title ?? ""}`;
  const toOpen = tool.app?.path ?? (tool.tool ? tool.tool : "");

  async function isRunning() {
    const grep = `ps aux | grep -v "grep" | grep "${tool.id}" | grep "${tool.build}"`;
    const { stdout } = await execPromise(grep).catch((err) => {
      // console.error({err})
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
    if (toOpen === "") {
      return showToast(Toast.Style.Failure, "Failed", "No app path or tool path");
    }
    let running = await isRunning();
    if (!running) {
      /**
       * WORKAROUND FOR ENVIRONMENT PROBLEMS
       * if the app is not running open it and wait for a bit
       * using the tool directly opens with the wrong env
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
      .then(() => recent !== null && exec(cmd))
      .then(() => popToRoot())
      .catch((error) => showToast(Toast.Style.Failure, "Failed", error.message).then(() => console.error({ error })));
  };
}

export function OpenInJetBrainsApp({ tool, recent }: OpenInJetBrainsAppActionProps): JSX.Element | null {
  return (
    <ActionPanel.Item
      title={`Open ${recent ? "with " : ""}${tool.title}`}
      icon={tool.icon}
      onAction={openInApp(tool, recent)}
    />
  );
}
