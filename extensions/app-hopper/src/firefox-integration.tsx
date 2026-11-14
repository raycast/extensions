import { Action, ActionPanel, Alert, Detail, Icon, Keyboard, Toast, confirmAlert, open, showToast } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useRef, useState } from "react";
import { geckoConfig, type GeckoBrowserId } from "./browsers/gecko-config";
import { disconnectFirefoxBridges, getFirefoxCompanionVersions, isFirefoxBridgeConnected } from "./browsers/firefox";
import {
  hasFirefoxHostRegistration,
  installFirefoxHost,
  isFirefoxHostInstalled,
  removeFirefoxHost,
} from "./browsers/firefox-integration";
import {
  downloadFirefoxCompanion,
  getFirefoxCompanionRelease,
  hasFirefoxCompanionUpdate,
} from "./browsers/firefox-companion";

async function loadStatus(browserId: GeckoBrowserId) {
  const [installed, registered, connected, versions, release] = await Promise.all([
    isFirefoxHostInstalled(browserId),
    hasFirefoxHostRegistration(browserId),
    isFirefoxBridgeConnected(browserId),
    getFirefoxCompanionVersions(browserId),
    getFirefoxCompanionRelease(),
  ]);
  return { installed, registered, connected, versions, release };
}

type IntegrationStatus = Awaited<ReturnType<typeof loadStatus>>;

function connectionState(data: IntegrationStatus | undefined, appName: string) {
  if (!data) return { status: "Checking connection…", hint: "" };
  if (data.connected) {
    if (!data.installed)
      return {
        status: `Connected for this ${appName} session. Repair the local helper before restarting ${appName}.`,
        hint: "",
      };
    const versions = [...new Set(data.versions)].join(", ");
    return { status: `Connected${versions ? ` — companion ${versions}` : ""}.`, hint: "" };
  }
  if (data.installed)
    return { status: "Not connected.", hint: "Click the companion's toolbar button, then check the connection." };
  if (data.registered)
    return { status: "Local helper needs repair.", hint: "Choose Repair Local Helper to reconnect." };
  const hint = data.release
    ? `Choose Enable ${appName} Integration, then confirm installation in ${appName}.`
    : "A signed companion download is not available yet.";
  return { status: "Not enabled.", hint };
}

function companionActionTitle(appName: string, updateAvailable: boolean, connected: boolean) {
  if (updateAvailable) return `Update ${appName} Companion`;
  if (connected) return `Reinstall ${appName} Companion`;
  return `Enable ${appName} Integration`;
}

export function FirefoxIntegrationView({ browserId = "firefox" }: { browserId?: GeckoBrowserId } = {}) {
  const { appName, bundleId } = geckoConfig(browserId);
  const { data, error, isLoading, revalidate } = useCachedPromise(loadStatus, [browserId]);
  const busy = useRef(false);
  const [isBusy, setBusy] = useState(false);

  async function perform(title: string, operation: () => Promise<{ title: string; message: string }>) {
    if (busy.current) return;
    busy.current = true;
    setBusy(true);
    const toast = await showToast({ style: Toast.Style.Animated, title });
    try {
      const result = await operation();
      toast.style = Toast.Style.Success;
      toast.title = result.title;
      toast.message = result.message;
    } catch (error) {
      await toast.hide();
      await showFailureToast(error, { title: `${appName} integration could not be changed` });
    } finally {
      // Loading errors are displayed by useCachedPromise in the detail view.
      revalidate();
      busy.current = false;
      setBusy(false);
    }
  }

  async function enable() {
    await perform(`Preparing ${appName} companion`, async () => {
      const release = await getFirefoxCompanionRelease();
      if (!release) throw new Error(`A signed ${appName} companion download is not available yet.`);
      const file = await downloadFirefoxCompanion(release, undefined, browserId);
      await installFirefoxHost(browserId);
      await open(file, bundleId);
      return {
        title: `Confirm installation in ${appName}`,
        message: `${appName} will verify the companion signature. Return here and check the connection after installing.`,
      };
    });
  }

  async function repair() {
    await perform(`Repairing ${appName} integration`, async () => {
      await installFirefoxHost(browserId);
      return {
        title: "Local helper is ready",
        message: `Click the companion's toolbar button or restart ${appName}, then check the connection.`,
      };
    });
  }

  async function remove() {
    if (busy.current) return;
    if (
      !(await confirmAlert({
        title: `Remove Local ${appName} Integration?`,
        message: `Stops local helpers and removes their files and downloaded companion packages. App and window switching will keep working. Remove the companion itself in ${appName}'s Add-ons Manager.`,
        primaryAction: { title: "Remove Local Integration", style: Alert.ActionStyle.Destructive },
      }))
    )
      return;
    await perform(`Removing local ${appName} integration`, async () => {
      await removeFirefoxHost(() => disconnectFirefoxBridges(browserId), browserId);
      return {
        title: "Local integration removed",
        message: `Use Manage ${appName} Companion to remove the companion from ${appName}, including other profiles.`,
      };
    });
  }

  const update = data?.release && hasFirefoxCompanionUpdate(data.versions, data.release) ? data.release : null;
  const updateAvailable = update !== null;
  const { status, hint } = connectionState(data, appName);
  const updateHint = update ? `Companion ${update.version} is available. Choose Update ${appName} Companion.` : "";
  const markdown = error
    ? `# ${appName} Integration\n\nCould not check integration: ${error instanceof Error ? error.message : String(error)}`
    : [`# ${appName} Integration`, status, hint, updateHint].filter(Boolean).join("\n\n");

  return (
    <Detail
      navigationTitle={`${appName} Integration`}
      markdown={markdown}
      isLoading={isLoading || isBusy}
      actions={
        <ActionPanel>
          {data?.release && (
            <Action
              title={companionActionTitle(appName, updateAvailable, data.connected)}
              icon={Icon.Download}
              onAction={enable}
            />
          )}
          {browserId === "zen" && data && !data.installed && !data.registered && (
            <Action title="Prepare Local Helper" icon={Icon.WrenchScrewdriver} onAction={repair} />
          )}
          <Action
            title="Check Connection"
            icon={Icon.Repeat}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={revalidate}
          />
          {data && (data.installed || data.registered || data.connected) && (
            <Action title="Repair Local Helper" icon={Icon.WrenchScrewdriver} onAction={repair} />
          )}
          <Action
            title={`Manage ${appName} Companion`}
            icon={Icon.Globe}
            onAction={() => open("about:addons", bundleId)}
          />
          {data && (
            <Action
              title="Remove Local Integration"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={remove}
            />
          )}
        </ActionPanel>
      }
    />
  );
}

export function FirefoxIntegrationAction({ browserId = "firefox" }: { browserId?: GeckoBrowserId } = {}) {
  const { appName } = geckoConfig(browserId);
  return (
    <Action.Push
      title={`Set up ${appName} Integration`}
      icon={Icon.Plug}
      target={<FirefoxIntegrationView browserId={browserId} />}
    />
  );
}
