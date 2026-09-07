import { Action, ActionPanel, Color, Detail, Icon, showHUD } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { downloadDir, prefs, rpcUrl } from "./lib/aria2";
import {
  HANDLER_APP_PATH,
  HANDLER_BUNDLE_ID,
  currentMagnetHandler,
  handlerAppExists,
  installMagnetHandler,
  uninstallMagnetHandler,
} from "./lib/magnet-handler";

export default function Command() {
  const { data, isLoading, revalidate } = usePromise(async () => {
    const handler = await currentMagnetHandler();
    return {
      installed: handlerAppExists(),
      handler,
      isDefault: handler === HANDLER_BUNDLE_ID,
    };
  }, []);

  const installed = data?.installed ?? false;
  const isDefault = data?.isDefault ?? false;
  const current = data?.handler ?? "none";

  const markdown = `# Magnet Link Handler

Raycast cannot register itself for \`magnet:\` URLs. This command installs a small helper app that talks to aria2c directly.

Clicked magnet links (and opened \`.torrent\` files) are added to aria2 and saved to **${downloadDir()}**.

## Status

- Helper app: ${installed ? `installed at \`${HANDLER_APP_PATH}\`` : "not installed"}
- Default \`magnet:\` handler: \`${current}\`${isDefault ? " (this helper)" : ""}

If macOS still prompts after install, choose **Aria2 Magnet Handler** and check Always Use.

The helper reads RPC host, secret, and download folder from extension preferences. Re-run install after changing those.`;

  async function install() {
    try {
      await installMagnetHandler({
        rpcUrl: rpcUrl(),
        rpcSecret: prefs().rpcSecret?.trim() || "",
        downloadDir: downloadDir(),
      });
      await showHUD(isDefault || installed ? "Magnet handler updated" : "Magnet handler installed");
      await revalidate();
    } catch (error) {
      await showFailureToast(error, { title: "Couldn't install magnet handler" });
    }
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Helper"
            text={installed ? { value: "Installed", color: Color.Green } : { value: "Missing", color: Color.Orange }}
          />
          <Detail.Metadata.Label
            title="Default Handler"
            text={isDefault ? { value: "Aria2", color: Color.Green } : { value: current, color: Color.SecondaryText }}
          />
          <Detail.Metadata.Label title="Download Folder" text={downloadDir()} />
          <Detail.Metadata.Label title="RPC" text={rpcUrl()} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action
            title={installed ? "Reinstall Magnet Handler" : "Install Magnet Handler"}
            icon={Icon.Download}
            onAction={install}
          />
          {installed ? (
            <Action
              title="Uninstall Magnet Handler"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={async () => {
                try {
                  await uninstallMagnetHandler();
                  await showHUD("Magnet handler removed");
                  await revalidate();
                } catch (error) {
                  await showFailureToast(error, { title: "Couldn't uninstall handler" });
                }
              }}
            />
          ) : null}
        </ActionPanel>
      }
    />
  );
}
