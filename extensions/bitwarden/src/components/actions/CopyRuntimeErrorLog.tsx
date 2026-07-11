import { Action, Alert, Clipboard, Icon, Toast, confirmAlert, showToast } from "@raycast/api";
import { capturedExceptions } from "~/utils/development";

function CopyRuntimeErrorLog() {
  const copyErrors = async () => {
    const errorString = capturedExceptions.toString();
    if (errorString.length === 0) {
      return showToast(Toast.Style.Success, "No errors to copy");
    }
    await Clipboard.copy(errorString);
    await showToast(Toast.Style.Success, "Errors copied to clipboard");
    await confirmAlert({
      title: "Be careful with this information",
      message:
        "Please be mindful of where you share this error log, as it may contain sensitive information. Always analyze it before sharing.",
      primaryAction: { title: "Got it", style: Alert.ActionStyle.Default },
    });
  };

  return (
    <Action onAction={copyErrors} title="Copy Last Errors" icon={Icon.CopyClipboard} style={Action.Style.Regular} />
  );
}

export default CopyRuntimeErrorLog;
