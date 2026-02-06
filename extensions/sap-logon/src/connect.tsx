import { LaunchProps, showToast, Toast, open, showHUD } from "@raycast/api";
import { createAndOpenSAPCFile, getSAPSystems } from "./utils";

export default async function Command(props: LaunchProps<{ arguments: Arguments.Connect }>) {
  const { systemId } = props.arguments;

  try {
    const systems = await getSAPSystems();

    // Find system by ID (case-insensitive) with priority matching:
    // 1. Exact match on systemId
    // 2. Exact match on systemId-client combo
    // 3. Starts with match (for partial typing)
    const searchLower = systemId.toLowerCase();
    const system =
      systems.find((s) => s.systemId.toLowerCase() === searchLower) ||
      systems.find((s) => `${s.systemId}-${s.client}`.toLowerCase() === searchLower) ||
      systems.find((s) => s.systemId.toLowerCase().startsWith(searchLower));

    if (!system) {
      await showToast({
        style: Toast.Style.Failure,
        title: "System Not Found",
        message: `No SAP system matching "${systemId}" found`,
      });
      return;
    }

    const filePath = await createAndOpenSAPCFile(system);
    await open(filePath);

    await showHUD(`🔗 Connecting to ${system.systemId} (Client ${system.client})`);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Connection Failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
