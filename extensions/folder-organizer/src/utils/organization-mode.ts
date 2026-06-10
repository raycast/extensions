import { Alert, confirmAlert } from "@raycast/api";
import { OrganizationMode } from "./file-organizer";

export async function chooseOrganizationMode(): Promise<OrganizationMode | null> {
  let selectedMode: OrganizationMode | null = null;

  await confirmAlert({
    title: "Choose organization mode",
    message:
      "Full Organization scans nested folders and skips detected software projects. Root Only organizes files directly inside the selected folder.",
    primaryAction: {
      title: "Full Organization",
      style: Alert.ActionStyle.Default,
      onAction: () => {
        selectedMode = "full";
      },
    },
    dismissAction: {
      title: "Root Only",
      style: Alert.ActionStyle.Cancel,
      onAction: () => {
        selectedMode = "root";
      },
    },
  });

  return selectedMode;
}
