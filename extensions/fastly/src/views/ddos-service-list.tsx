import { List, ActionPanel, Action, Icon, Color, showToast, Toast, Keyboard, confirmAlert, Alert } from "@raycast/api";
import { useEffect, useState } from "react";
import { FastlyService } from "../types";
import {
  getServices,
  getDdosProtectionEnabledServices,
  getDdosProtectionMode,
  setDdosProtectionMode,
  enableDdosProtection,
  disableDdosProtection,
} from "../api";
import { DdosEventList } from "./ddos-event-list";
import { DdosStatsDetail } from "./ddos-stats-detail";
import { DdosRuleList } from "./ddos-rule-list";

export function DdosServiceList() {
  const [services, setServices] = useState<FastlyService[]>([]);
  // null means the enablement lookup failed and the true state is unknown
  const [enabledIds, setEnabledIds] = useState<Set<string> | null>(new Set());
  const [modes, setModes] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadServices();
  }, []);

  async function loadServices() {
    try {
      setIsLoading(true);
      const [allServices, enabled] = await Promise.all([
        getServices(),
        // Don't fail the whole list if enablement status can't be read (e.g. no DDoS Protection entitlement)
        getDdosProtectionEnabledServices().catch((error) => {
          console.error("Error loading DDoS Protection enablement:", error);
          return null;
        }),
      ]);
      setServices(allServices);
      setEnabledIds(enabled === null ? null : new Set(enabled));
      if (enabled === null) {
        setModes({});
        await showToast({
          style: Toast.Style.Failure,
          title: "Couldn't determine DDoS Protection status",
          message: "Enablement state is unknown — retry with the refresh action",
        });
        return;
      }

      const modeEntries = await Promise.all(
        enabled.map(async (serviceId) => [serviceId, await getDdosProtectionMode(serviceId).catch(() => undefined)]),
      );
      setModes(Object.fromEntries(modeEntries.filter(([, mode]) => mode)));
    } catch (error) {
      console.error("Error loading services:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load services",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleEnable(service: FastlyService) {
    if (
      await confirmAlert({
        title: "Enable DDoS Protection",
        message: `Enable DDoS Protection on "${service.name}"? This activates a paid product on the service and may affect billing. Protection starts in log mode.`,
        primaryAction: { title: "Enable" },
      })
    ) {
      try {
        await enableDdosProtection(service.id);
        await showToast({ style: Toast.Style.Success, title: "DDoS Protection enabled", message: service.name });
        await loadServices();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to enable DDoS Protection",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  }

  async function handleDisable(service: FastlyService) {
    if (
      await confirmAlert({
        title: "Disable DDoS Protection",
        message: `Disable DDoS Protection on "${service.name}"? Attack detection and mitigation will stop on this service.`,
        primaryAction: { title: "Disable", style: Alert.ActionStyle.Destructive },
      })
    ) {
      try {
        await disableDdosProtection(service.id);
        await showToast({ style: Toast.Style.Success, title: "DDoS Protection disabled", message: service.name });
        await loadServices();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to disable DDoS Protection",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  }

  async function handleSetMode(service: FastlyService, mode: "log" | "block") {
    const messages = {
      block: `Switch "${service.name}" to block mode? DDoS Protection will actively block traffic identified as attacks.`,
      log: `Switch "${service.name}" to log mode? Attacks will be logged but no longer blocked.`,
    };
    if (
      await confirmAlert({
        title: mode === "block" ? "Enable Blocking" : "Switch to Log Mode",
        message: messages[mode],
        primaryAction: { title: mode === "block" ? "Block Attacks" : "Log Only" },
      })
    ) {
      try {
        await setDdosProtectionMode(service.id, mode);
        await showToast({ style: Toast.Style.Success, title: `Switched to ${mode} mode`, message: service.name });
        // The outcome is known; avoid refetching every service and mode
        setModes((current) => ({ ...current, [service.id]: mode }));
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to update protection mode",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  }

  const enabledServices = enabledIds ? services.filter((service) => enabledIds.has(service.id)) : [];
  const disabledServices = enabledIds ? services.filter((service) => !enabledIds.has(service.id)) : [];

  function commonActions(service: FastlyService) {
    return (
      <>
        <ActionPanel.Section title="Account">
          <Action.Push
            title="View Recent Rules"
            icon={Icon.List}
            shortcut={{
              macOS: { modifiers: ["cmd", "shift"], key: "u" },
              Windows: { modifiers: ["ctrl", "shift"], key: "u" },
            }}
            target={<DdosRuleList />}
          />
        </ActionPanel.Section>
        <ActionPanel.Section title="Actions">
          <Action.CopyToClipboard
            title="Copy Service ID"
            content={service.id}
            shortcut={{
              macOS: { modifiers: ["cmd", "shift"], key: "c" },
              Windows: { modifiers: ["ctrl", "shift"], key: "c" },
            }}
          />
          <Action.OpenInBrowser
            title="Open in Fastly"
            url={`https://manage.fastly.com/configure/services/${service.id}`}
          />
        </ActionPanel.Section>
        <ActionPanel.Section title="Quick Access">
          <Action
            title="Refresh List"
            icon={Icon.ArrowClockwise}
            onAction={loadServices}
            shortcut={Keyboard.Shortcut.Common.Refresh}
          />
        </ActionPanel.Section>
      </>
    );
  }

  function modeAccessory(serviceId: string): List.Item.Accessory {
    const mode = modes[serviceId];
    if (mode === "block") {
      return { tag: { value: "Blocking", color: Color.Green }, tooltip: "Attacks are blocked and logged" };
    }
    if (mode === "log") {
      return { tag: { value: "Log Only", color: Color.Orange }, tooltip: "Attacks are logged but not blocked" };
    }
    return { tag: { value: "Enabled", color: Color.Green } };
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search services by name...">
      {services.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No Services Found"
          description="Your account doesn't have any services yet."
          icon={Icon.Globe}
        />
      ) : enabledIds === null ? (
        <List.Section title="Enablement Status Unknown" subtitle={String(services.length)}>
          {services.map((service) => (
            <List.Item
              key={service.id}
              title={service.name}
              subtitle={service.id}
              icon={{ source: Icon.Shield, tintColor: Color.SecondaryText }}
              accessories={[{ tag: { value: "Status Unknown", color: Color.Orange } }]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action title="Retry Status Check" icon={Icon.ArrowClockwise} onAction={loadServices} />
                    <Action.Push
                      title="View DDoS Overview"
                      icon={Icon.LineChart}
                      target={<DdosStatsDetail service={service} />}
                    />
                    <Action.Push
                      title="View Attack Events"
                      icon={Icon.Bolt}
                      target={<DdosEventList service={service} />}
                    />
                  </ActionPanel.Section>
                  {commonActions(service)}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : (
        <>
          <List.Section title="DDoS Protection Enabled" subtitle={String(enabledServices.length)}>
            {enabledServices.map((service) => (
              <List.Item
                key={service.id}
                title={service.name}
                subtitle={service.id}
                icon={{ source: Icon.Shield, tintColor: Color.Green }}
                accessories={[modeAccessory(service.id)]}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      <Action.Push
                        title="View DDoS Overview"
                        icon={Icon.LineChart}
                        target={<DdosStatsDetail service={service} />}
                      />
                      <Action.Push
                        title="View Attack Events"
                        icon={Icon.Bolt}
                        target={<DdosEventList service={service} />}
                      />
                      <Action.Push title="View Rules" icon={Icon.List} target={<DdosRuleList service={service} />} />
                      {modes[service.id] !== "block" && (
                        <Action
                          title="Switch to Block Mode"
                          icon={Icon.Shield}
                          onAction={() => handleSetMode(service, "block")}
                        />
                      )}
                      {modes[service.id] !== "log" && (
                        <Action
                          title="Switch to Log Mode"
                          icon={Icon.Document}
                          onAction={() => handleSetMode(service, "log")}
                        />
                      )}
                      <Action
                        title="Disable DDoS Protection"
                        icon={Icon.XMarkCircle}
                        style={Action.Style.Destructive}
                        onAction={() => handleDisable(service)}
                      />
                    </ActionPanel.Section>
                    {commonActions(service)}
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>

          <List.Section title="Not Enabled" subtitle={String(disabledServices.length)}>
            {disabledServices.map((service) => (
              <List.Item
                key={service.id}
                title={service.name}
                subtitle={service.id}
                icon={{ source: Icon.Shield, tintColor: Color.SecondaryText }}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      <Action
                        title="Enable DDoS Protection"
                        icon={Icon.Shield}
                        onAction={() => handleEnable(service)}
                      />
                    </ActionPanel.Section>
                    {commonActions(service)}
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}
