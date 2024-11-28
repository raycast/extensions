import { AppHistory, execPromise, recentEntry, ToolboxApp } from "../util";
import { ActionPanel, popToRoot, showHUD, showToast, Toast, open } from "@raycast/api";

interface OpenInJetBrainsAppActionProps {
  tool: AppHistory;
  recent: recentEntry | null;
  toolboxApp: ToolboxApp;
}

export function openInApp(tool: AppHistory, recent: recentEntry | null, v2: boolean): () => Promise<Toast | undefined> {
  const cmd = tool.tool
    ? `"${tool.tool}" "${recent?.path ?? ""}"`
    : tool.url
    ? `open ${tool.url}${recent?.title ?? ""}`
    : undefined;
  const toOpen = tool.app?.path ?? "";

  async function isRunning() {
    const grep = v2
      ? `ps aux | grep -v "grep" | grep "${tool.app?.path}"`
      : `ps aux | grep -v "grep" | grep "${tool.id}" | grep "${tool.build}"`;
    const { stdout } = await execPromise(grep).catch((err) => {
      // console.error({ err });
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
    if (cmd === undefined) {
      return showToast(
        Toast.Style.Failure,
        "Failed",
        "No script or url configured, have you enabled shell scripts in JetBrains Toolbox or enabled protocol urls in the extension config"
      );
    }

    if (toOpen === "" && tool.tool === false) {
      return showToast(Toast.Style.Failure, "Failed", "No app path");
    }
    let running = await isRunning();
    if (!running) {
      if (toOpen === "") {
        return showToast(Toast.Style.Failure, "Failed", "No app path");
      }
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
      .then(() => recent !== null && execPromise(cmd) && null)
      .then(() => popToRoot())
      .catch((error) => showToast(Toast.Style.Failure, "Failed", error.message).then(() => console.error({ error })));
  };
}

export function OpenInJetBrainsApp({ tool, recent, toolboxApp }: OpenInJetBrainsAppActionProps): JSX.Element | null {
  return (
    <ActionPanel.Item
      title={`Open ${recent ? "with " : ""}${tool.title}`}
      icon={tool.icon}
      onAction={openInApp(tool, recent, toolboxApp?.isV2)}
    />
  );
}
