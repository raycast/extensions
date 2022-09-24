import { ChildProcess, exec } from "child_process";
import { AppHistory, recentEntry } from "../util";
import { ActionPanel, popToRoot, showHUD, showToast, Toast, open } from "@raycast/api";
import { promisify } from "util";

const execPromise = promisify(exec);

interface OpenInJetBrainsAppActionProps {
  tool: AppHistory;
  recent: recentEntry | null;
}

const handleError = (error: Error) =>
  showToast(Toast.Style.Failure, "Failed", error.message).then(() => console.error({ error }));
const isRunning = (tool: AppHistory): Promise<boolean> => {
  return execPromise(`ps aux | grep -v "grep" | grep -i "${tool.app?.path}"`)
    .then(({ stdout }) => stdout !== "")
    .catch(() => false);
};
const sleep = (seconds: number): Promise<void> => {
  return new Promise(function (resolve) {
    setTimeout(resolve, seconds * 1000);
  });
};

export function openInApp(
  tool: AppHistory,
  recent: recentEntry | null
): () => Promise<void | ChildProcess | Toast | null> {
  const cmd = tool.tool ? `"${tool.tool}" "${recent?.path ?? ""}"` : `open ${tool.url}${recent?.title ?? ""}`;
  const toOpen = tool.app?.path ?? (tool.tool ? tool.tool : "");

  const doOpen = () => popToRoot().then(() => recent && exec(cmd));

  return () => {
    if (toOpen === "") {
      return showToast(Toast.Style.Failure, "Failed", "No app path or tool path");
    }
    return isRunning(tool)
      .then((running) => {
        if (!running) {
          /**
           * WORKAROUND FOR ENVIRONMENT PROBLEMS
           * if the app is not running open it and wait for a bit
           * using the tool directly opens with the wrong env
           * and we need to wait so the tool actually does open
           */
          console.log("not-running");
          return showHUD(`Opening ${tool.app?.title ?? tool.title}${recent ? ":" + recent.title : ""}`)
            .then(() => open(toOpen))
            .then(async () => {
              do {
                running = await isRunning(tool);
              } while (!running);
              return sleep(2);
            })
            .then(doOpen);
        }
        return showHUD(`Opening ${recent ? recent.title : tool.app?.title ?? tool.title}`).then(doOpen);
      })
      .catch(handleError);
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
