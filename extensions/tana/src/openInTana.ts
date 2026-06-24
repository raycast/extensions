import { PopToRootType, Toast, closeMainWindow, open, showToast } from "@raycast/api";
import type { TanaMcpClient } from "./api/TanaAPIClient";
import type { NodeRef } from "./components/NodeActions";

export type TanaOpenType = "current" | "panel" | "tab";

const TANA_APP_PATH = "/Applications/Tana Outliner.app";

export async function activateTanaApp() {
  await closeMainWindow({ popToRootType: PopToRootType.Suspended });
  await open(TANA_APP_PATH);
}

export async function openNodeInTana(
  client: TanaMcpClient,
  node: NodeRef,
  openType: TanaOpenType = "current",
  activate: () => Promise<void> = activateTanaApp,
) {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Opening in Tana" });
  try {
    await client.openNode(node.id, openType);
    try {
      await activate();
      toast.style = Toast.Style.Success;
      toast.title = "Opened in Tana";
    } catch (error) {
      toast.style = Toast.Style.Success;
      toast.title = "Requested Tana Open";
      toast.message =
        error instanceof Error
          ? `Tana accepted the node open, but Raycast could not activate Tana: ${error.message}`
          : "Tana accepted the node open, but Raycast could not activate Tana.";
    }
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Unable to Open in Tana";
    toast.message = error instanceof Error ? error.message : "Unknown error";
  }
}
