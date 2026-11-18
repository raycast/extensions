import { List, ActionPanel, Action, Icon, showToast, Toast, Keyboard } from "@raycast/api";
import { ReactNode, useEffect, useState } from "react";
import { FastlyService } from "../types";
import { getServices } from "../api";

interface ServicePickerProps {
  actionTitle: string;
  actionIcon: Icon;
  searchBarPlaceholder: string;
  getTarget: (service: FastlyService) => ReactNode;
}

// Shared "pick a service, then push a view" list used by commands that
// operate on a single service.
export function ServicePicker({ actionTitle, actionIcon, searchBarPlaceholder, getTarget }: ServicePickerProps) {
  const [services, setServices] = useState<FastlyService[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadServices();
  }, []);

  async function loadServices() {
    try {
      setIsLoading(true);
      setServices(await getServices());
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load services",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder={searchBarPlaceholder}>
      {services.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No Services Found"
          description="Your account doesn't have any services yet."
          icon={Icon.Globe}
        />
      ) : (
        services.map((service) => (
          <List.Item
            key={service.id}
            title={service.name}
            subtitle={service.id}
            icon={service.type === "wasm" ? Icon.Terminal : Icon.Globe}
            accessories={[{ text: service.type === "wasm" ? "Compute" : "CDN" }]}
            actions={
              <ActionPanel>
                <Action.Push title={actionTitle} icon={actionIcon} target={getTarget(service)} />
                <Action.CopyToClipboard
                  title="Copy Service ID"
                  content={service.id}
                  shortcut={{
                    macOS: { modifiers: ["cmd", "shift"], key: "c" },
                    Windows: { modifiers: ["ctrl", "shift"], key: "c" },
                  }}
                />
                <Action
                  title="Refresh List"
                  icon={Icon.ArrowClockwise}
                  onAction={loadServices}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
