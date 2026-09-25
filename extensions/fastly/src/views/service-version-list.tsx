import { List, ActionPanel, Action, Icon, Color, showToast, Toast, Keyboard, confirmAlert } from "@raycast/api";
import { useEffect, useState } from "react";
import { FastlyService, ServiceVersion } from "../types";
import { getServiceVersions, activateServiceVersion, cloneServiceVersion } from "../api";
import { ServiceVersionDiff } from "./service-version-diff";

interface ServiceVersionListProps {
  service: FastlyService;
}

export function ServiceVersionList({ service }: ServiceVersionListProps) {
  const [versions, setVersions] = useState<ServiceVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadVersions();
  }, []);

  async function loadVersions() {
    try {
      setIsLoading(true);
      const allVersions = await getServiceVersions(service.id);
      setVersions([...allVersions].sort((a, b) => b.number - a.number));
    } catch (error) {
      console.error("Error loading versions:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load versions",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const activeVersion = versions.find((version) => version.active);

  async function handleActivate(version: ServiceVersion) {
    const isRollback = activeVersion && version.number < activeVersion.number;
    if (
      await confirmAlert({
        title: isRollback ? `Roll Back to Version ${version.number}` : `Activate Version ${version.number}`,
        message: `Activate version ${version.number} on "${service.name}"? Live traffic switches to this configuration immediately${
          activeVersion ? ` (currently on version ${activeVersion.number})` : ""
        }.`,
        primaryAction: { title: "Activate" },
      })
    ) {
      try {
        await activateServiceVersion(service.id, version.number);
        await showToast({
          style: Toast.Style.Success,
          title: `Version ${version.number} activated`,
          message: service.name,
        });
        await loadVersions();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to activate version",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  }

  async function handleClone(version: ServiceVersion) {
    try {
      const cloned = await cloneServiceVersion(service.id, version.number);
      await showToast({
        style: Toast.Style.Success,
        title: `Cloned version ${version.number}`,
        message: `New draft version ${cloned.number}`,
      });
      await loadVersions();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to clone version",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  function versionAccessories(version: ServiceVersion): List.Item.Accessory[] {
    const accessories: List.Item.Accessory[] = [];
    if (version.active) accessories.push({ tag: { value: "Active", color: Color.Green } });
    if (version.staging) accessories.push({ tag: { value: "Staging", color: Color.Blue } });
    if (version.testing) accessories.push({ tag: { value: "Testing", color: Color.Blue } });
    if (version.locked) {
      accessories.push({ icon: Icon.Lock, tooltip: "Locked — clone to make changes" });
    } else {
      accessories.push({ tag: { value: "Draft", color: Color.Orange } });
    }
    accessories.push({
      date: new Date(version.updated_at),
      tooltip: `Updated: ${new Date(version.updated_at).toLocaleString()}`,
    });
    return accessories;
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`Versions — ${service.name}`}
      searchBarPlaceholder="Search versions by number or comment..."
    >
      {versions.map((version) => (
        <List.Item
          key={version.number}
          title={`Version ${version.number}`}
          subtitle={version.comment}
          keywords={[String(version.number)]}
          icon={version.active ? { source: Icon.CheckCircle, tintColor: Color.Green } : Icon.Circle}
          accessories={versionAccessories(version)}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                {activeVersion && version.number !== activeVersion.number && service.type?.toLowerCase() !== "wasm" && (
                  <Action.Push
                    title="Diff with Active Version"
                    icon={Icon.CodeBlock}
                    target={<ServiceVersionDiff service={service} from={activeVersion.number} to={version.number} />}
                  />
                )}
                {!version.active && (
                  <Action
                    title={
                      activeVersion && version.number < activeVersion.number
                        ? `Roll Back to Version ${version.number}`
                        : `Activate Version ${version.number}`
                    }
                    icon={Icon.Bolt}
                    onAction={() => handleActivate(version)}
                  />
                )}
                <Action title="Clone Version" icon={Icon.Duplicate} onAction={() => handleClone(version)} />
              </ActionPanel.Section>

              <ActionPanel.Section title="Actions">
                <Action.OpenInBrowser
                  title="Open in Fastly"
                  url={`https://manage.fastly.com/configure/services/${service.id}/versions/${version.number}`}
                />
              </ActionPanel.Section>

              <ActionPanel.Section title="Quick Access">
                <Action
                  title="Refresh List"
                  icon={Icon.ArrowClockwise}
                  onAction={loadVersions}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
