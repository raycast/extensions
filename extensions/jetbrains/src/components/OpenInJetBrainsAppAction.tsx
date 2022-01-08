import { exec } from "child_process";
import { AppHistory, recentEntry } from "../util";
import { ActionPanel, popToRoot, showHUD, showToast, ToastStyle } from "@raycast/api";

interface OpenInJetBrainsAppActionProps {
  tool: AppHistory;
  recent: recentEntry | null;
}

export function OpenInJetBrainsAppAction({ tool, recent }: OpenInJetBrainsAppActionProps): JSX.Element {
  function handleAction() {
    const cmd = tool.tool ? `${tool.tool} "${recent?.path ?? ""}"` : `open ${tool.url}${recent?.title ?? ""}`;
    showHUD(`Opening ${recent ? recent.title : tool.title}`)
      .then(() => exec(cmd, { env: {} }))
      .then(() => popToRoot())
      .catch((error) => showToast(ToastStyle.Failure, "Failed", error.message).then(() => console.error({ error })));
  }

  return (
    <ActionPanel.Item title={`Open ${recent ? "with " : ""}${tool.title}`} icon={tool.icon} onAction={handleAction} />
  );
}
