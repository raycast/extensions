import { ActionPanel, Color, Icon, List, Toast, popToRoot, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import api from "./api.js";

/**
 * @param {Object} props
 * @param {string} props.xKey
 * @param {string} props.port
 * @param {boolean} props.isHttpCaptureEnabled
 * @param {boolean} props.isMitmEnabled
 * @param {boolean} props.isRewriteEnabled
 * @param {boolean} props.isScriptingEnabled
 * @returns {React.ReactElement}
 */
export default function CapabilitiesActions({
  xKey,
  port,
  isHttpCaptureEnabled,
  isMitmEnabled,
  isRewriteEnabled,
  isScriptingEnabled,
}: {
  xKey: string;
  port: string;
  isHttpCaptureEnabled: boolean;
  isMitmEnabled: boolean;
  isRewriteEnabled: boolean;
  isScriptingEnabled: boolean;
}) {
  const iconCheckMark = { source: Icon.Checkmark, tintColor: Color.Green };
  const iconTransparent = { source: "Transparent.png" };

  const HttpCaptureIcon = isHttpCaptureEnabled ? iconCheckMark : iconTransparent;
  const MitmIcon = isMitmEnabled ? iconCheckMark : iconTransparent;
  const RewriteIcon = isRewriteEnabled ? iconCheckMark : iconTransparent;
  const ScriptingIcon = isScriptingEnabled ? iconCheckMark : iconTransparent;

  async function handleAction({ type, mode }: { type: string; mode: boolean }) {
    try {
      await handleApiCalls({ type, mode });
      await showToast(Toast.Style.Success, "Success", `${type} has been ${mode === true ? "enabled" : "disabled"}.`);
      popToRoot({ clearSearchBar: true });
    } catch (error) {
      await showFailureToast(error, {
        title: "Failed",
        message: "Please check your X-Key, port and function availability",
      });
    }
  }

  function handleApiCalls({ type, mode }: { type: string; mode: boolean }) {
    if (type === "HTTP Capture") return api(xKey, port).changeHttpCaptureStatus(mode);
    else if (type === "MitM") return api(xKey, port).changeMitmStatus(mode);
    else if (type === "Rewrite") return api(xKey, port).changeRewriteStatus(mode);
    else if (type === "Scripting") return api(xKey, port).changeScriptingStatus(mode);
    return null;
  }

  return (
    <List.Item
      title="Capabilities"
      icon={Icon.ArrowRight}
      actions={
        <ActionPanel title="Capabilities">
          <ActionPanel.Submenu title="Capabilities">
            <ActionPanel.Item
              title="HTTP Capture"
              icon={HttpCaptureIcon}
              onAction={() => handleAction({ type: "HTTP Capture", mode: !isHttpCaptureEnabled })}
            />
            <ActionPanel.Item
              title="MitM"
              icon={MitmIcon}
              onAction={() => handleAction({ type: "MitM", mode: !isMitmEnabled })}
            />
            <ActionPanel.Item
              title="Rewrite"
              icon={RewriteIcon}
              onAction={() => handleAction({ type: "Rewrite", mode: !isRewriteEnabled })}
            />
            <ActionPanel.Item
              title="Scripting"
              icon={ScriptingIcon}
              onAction={() => handleAction({ type: "Scripting", mode: !isScriptingEnabled })}
            />
          </ActionPanel.Submenu>
        </ActionPanel>
      }
    />
  );
}
