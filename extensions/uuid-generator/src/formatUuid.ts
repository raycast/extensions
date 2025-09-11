import { Clipboard, getPreferenceValues, LaunchProps, showHUD, showToast, Toast } from "@raycast/api";

function formatUuidWithDashes(uuid: string): string {
  const cleanUuid = uuid.replace(/[^a-fA-F0-9]/g, "");

  if (cleanUuid.length !== 32) {
    throw new Error("Invalid UUID format: must be 32 hexadecimal characters");
  }

  return [
    cleanUuid.substring(0, 8),
    cleanUuid.substring(8, 12),
    cleanUuid.substring(12, 16),
    cleanUuid.substring(16, 20),
    cleanUuid.substring(20, 32),
  ].join("-");
}

export default async (props: LaunchProps<{ arguments: { uuid: string } }>) => {
  const { uuid } = props.arguments;
  if (!uuid) {
    await showToast({ style: Toast.Style.Failure, title: "No UUID provided" });
    return;
  }

  const { defaultAction } = getPreferenceValues<{ defaultAction: "copy" | "paste" }>();

  try {
    const formattedUuid = formatUuidWithDashes(uuid);

    if (defaultAction === "copy") {
      await Clipboard.copy(formattedUuid);
    } else if (defaultAction === "paste") {
      await Clipboard.paste(formattedUuid);
    }

    const action = defaultAction === "copy" ? "Copied" : "Pasted";
    await showHUD(`✅ ${action} formatted UUID: ${formattedUuid}`);
  } catch (error) {
    await showToast({ style: Toast.Style.Failure, title: "Formatting Error", message: String(error) });
  }
};
