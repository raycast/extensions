import { List, ActionPanel, Action, Icon, Color, showToast, Toast, Keyboard, confirmAlert, Alert } from "@raycast/api";
import { useEffect, useState } from "react";
import { FastlyService } from "../types";
import { getServices, getBotManagementEnabledServices, enableBotManagement, disableBotManagement } from "../api";
import { BotStatsDetail } from "./bot-stats-detail";

export function BotServiceList() {
  const [services, setServices] = useState<FastlyService[]>([]);
  // null means the enablement lookup failed and the true state is unknown
  const [enabledIds, setEnabledIds] = useState<Set<string> | null>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadServices();
  }, []);

  async function loadServices() {
    try {
      setIsLoading(true);
      const [allServices, enabled] = await Promise.all([
        getServices(),
        // Don't fail the whole list if enablement status can't be read; track it as unknown instead
        getBotManagementEnabledServices().catch((error) => {
          console.error("Error loading Bot Management enablement:", error);
          return null;
        }),
      ]);
      setServices(allServices);
      setEnabledIds(enabled === null ? null : new Set(enabled));
      if (enabled === null) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Couldn't determine Bot Management status",
          message: "Enablement state is unknown — retry with the refresh action",
        });
      }
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
        title: "Enable Bot Management",
        message: `Enable Bot Management on "${service.name}"? This activates a paid product on the service and may affect billing.`,
        primaryAction: { title: "Enable" },
      })
    ) {
      try {
        await enableBotManagement(service.id);
        await showToast({ style: Toast.Style.Success, title: "Bot Management enabled", message: service.name });
        await loadServices();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to enable Bot Management",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  }

  async function handleDisable(service: FastlyService) {
    if (
      await confirmAlert({
        title: "Disable Bot Management",
        message: `Disable Bot Management on "${service.name}"? Bot detection and challenges will stop on this service.`,
        primaryAction: { title: "Disable", style: Alert.ActionStyle.Destructive },
      })
    ) {
      try {
        await disableBotManagement(service.id);
        await showToast({ style: Toast.Style.Success, title: "Bot Management disabled", message: service.name });
        await loadServices();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to disable Bot Management",
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
                      title="View Bot Traffic"
                      icon={Icon.BarChart}
                      target={<BotStatsDetail service={service} />}
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
          <List.Section title="Bot Management Enabled" subtitle={String(enabledServices.length)}>
            {enabledServices.map((service) => (
              <List.Item
                key={service.id}
                title={service.name}
                subtitle={service.id}
                icon={{ source: Icon.Shield, tintColor: Color.Green }}
                accessories={[{ tag: { value: "Enabled", color: Color.Green } }]}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      <Action.Push
                        title="View Bot Traffic"
                        icon={Icon.BarChart}
                        target={<BotStatsDetail service={service} />}
                      />
                      <Action
                        title="Disable Bot Management"
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
                      <Action title="Enable Bot Management" icon={Icon.Shield} onAction={() => handleEnable(service)} />
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
