import { Action, ActionPanel, Clipboard, Detail, Icon, Keyboard, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { pathToFileURL } from "node:url";
import { captureScreenshot, ensureDesktopRunning } from "../services/desktop";
import { Machine } from "../types";
import { describeError, errorToast } from "../utils/errors";
import { formatDateTime } from "../utils/format";

export function DesktopScreenshot({ machine }: { machine: Machine }) {
  const { data, isLoading, error, revalidate } = usePromise(
    async (machineId: string) => {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Taking screenshot…" });
      await ensureDesktopRunning(machineId, (message) => (toast.message = message));
      toast.message = "Capturing the desktop…";
      const path = await captureScreenshot(machineId);
      await toast.hide();
      return { path, takenAt: new Date() };
    },
    [machine.id],
    { onError: errorToast("Could not take a screenshot") },
  );

  let markdown = `Taking a screenshot of **${machine.name}**…`;
  if (data) {
    // pathToFileURL also turns a Windows path (C:\…) into a valid file URL.
    const image = pathToFileURL(data.path).href;
    markdown = `![Desktop of ${machine.name}](${image})\n\nTaken ${formatDateTime(data.takenAt)}`;
  } else if (error && !isLoading) {
    const { title, message } = describeError(error);
    markdown = `**${title}**\n\n${message ?? ""}`;
  }

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={`${machine.name} Desktop`}
      markdown={markdown}
      actions={
        <ActionPanel>
          {data && <Action.Open title="Open Screenshot" target={data.path} icon={Icon.Image} />}
          {data && (
            <Action
              title="Copy Image"
              icon={Icon.CopyClipboard}
              shortcut={Keyboard.Shortcut.Common.Copy}
              onAction={async () => {
                await Clipboard.copy({ file: data.path });
                await showToast({ style: Toast.Style.Success, title: "Copied screenshot" });
              }}
            />
          )}
          <Action
            title="Take New Screenshot"
            icon={Icon.Camera}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={revalidate}
          />
          {data && <Action.ShowInFinder path={data.path} />}
        </ActionPanel>
      }
    />
  );
}
