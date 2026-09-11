import { List, Grid, showToast, Toast, ActionPanel, Action, Icon, Color } from "@raycast/api";
import { useEffect, useState } from "react";
import { useCachedState, usePromise } from "@raycast/utils";
import { LIFXClientManager } from "./lib/lifx-client";
import { LIFXLight } from "./lib/types";
import { LightListItem } from "./components/LightListItem";
import { LightGridItem } from "./components/LightGridItem";

type ViewMode = "list" | "grid";

export default function Command() {
  const [lights, setLights] = useState<LIFXLight[]>([]);
  const [viewMode, setViewMode] = useCachedState<ViewMode>("view-mode", "list");
  const [client] = useState(() => new LIFXClientManager());
  const { isLoading } = usePromise(
    async () => {
      await client.initialize();
      const discoveredLights = await client.discoverLights();
      setLights(discoveredLights);

      const state = client.getConnectionState();
      if (discoveredLights.length === 0) {
        showToast({
          style: Toast.Style.Failure,
          title: "No lights discovered",
          message:
            state.lanAvailable || state.httpAvailable ? "No LIFX lights found" : "Enable LAN or provide API token",
        });
      } else {
        showToast({
          style: Toast.Style.Success,
          title: `Found ${discoveredLights.length} light${discoveredLights.length !== 1 ? "s" : ""}`,
        });
      }

      return discoveredLights;
    },
    [],
    {
      onError: (error) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to discover lights",
          message: error instanceof Error ? error.message : String(error),
        });
      },
    },
  );

  useEffect(() => {
    return () => {
      client.destroy();
    };
  }, []);

  async function refreshLights() {
    console.log(`[UI] Refresh requested`);
    try {
      const discoveredLights = await client.discoverLights();
      console.log(`[UI] Setting ${discoveredLights.length} lights in state`);
      setLights(discoveredLights);
      showToast({
        style: Toast.Style.Success,
        title: `Refreshed - ${discoveredLights.length} light${discoveredLights.length !== 1 ? "s" : ""}`,
      });
    } catch (error) {
      console.error(`[UI] Refresh failed:`, error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to refresh lights",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function controlAllLights(action: "on" | "off" | "brightness", value?: number) {
    try {
      for (const light of lights) {
        if (action === "on") {
          await client.controlLight(light.id, { power: true });
        } else if (action === "off") {
          await client.controlLight(light.id, { power: false });
        } else if (action === "brightness" && value !== undefined) {
          await client.controlLight(light.id, { brightness: value });
        }
      }
      showToast({
        style: Toast.Style.Success,
        title: `All lights ${action === "on" ? "turned on" : action === "off" ? "turned off" : `set to ${value}%`}`,
      });
      // Wait for bulbs to broadcast new state before refreshing UI
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await refreshLights();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to control all lights",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const toggleViewMode = () => {
    setViewMode(viewMode === "list" ? "grid" : "list");
  };

  const commonActions = (
    <ActionPanel.Section>
      <Action
        title={`Switch to ${viewMode === "list" ? "Grid" : "List"} View`}
        icon={viewMode === "list" ? Icon.AppWindowGrid2x2 : Icon.List}
        onAction={toggleViewMode}
        shortcut={{ modifiers: ["cmd"], key: "v" }}
      />
      <Action
        title="Refresh Lights"
        icon={Icon.ArrowClockwise}
        onAction={refreshLights}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
      />
    </ActionPanel.Section>
  );

  const allLightsActions = (
    <>
      <ActionPanel.Section title="All Lights">
        <Action
          title="Turn All on"
          icon={Icon.Power}
          onAction={() => controlAllLights("on")}
          shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
        />
        <Action
          title="Turn All off"
          icon={Icon.XMarkCircle}
          onAction={() => controlAllLights("off")}
          shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Set All Brightness">
        <Action
          title="All to 100%"
          icon={Icon.Sun}
          onAction={() => controlAllLights("brightness", 100)}
          shortcut={{ modifiers: ["cmd", "shift"], key: "1" }}
        />
        <Action
          title="All to 75%"
          icon={Icon.Sun}
          onAction={() => controlAllLights("brightness", 75)}
          shortcut={{ modifiers: ["cmd", "shift"], key: "2" }}
        />
        <Action
          title="All to 50%"
          icon={Icon.Circle}
          onAction={() => controlAllLights("brightness", 50)}
          shortcut={{ modifiers: ["cmd", "shift"], key: "3" }}
        />
        <Action
          title="All to 25%"
          icon={Icon.Circle}
          onAction={() => controlAllLights("brightness", 25)}
          shortcut={{ modifiers: ["cmd", "shift"], key: "4" }}
        />
      </ActionPanel.Section>
      {commonActions}
    </>
  );

  if (viewMode === "grid") {
    return (
      <Grid
        isLoading={isLoading}
        columns={4}
        aspectRatio="1"
        fit={Grid.Fit.Fill}
        searchBarPlaceholder="Search lights..."
        actions={
          lights.length === 0 && !isLoading ? (
            <ActionPanel>
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={refreshLights} />
              {commonActions}
            </ActionPanel>
          ) : undefined
        }
      >
        {lights.length === 0 && !isLoading ? (
          <Grid.EmptyView
            title="No LIFX Lights Found"
            description="Make sure your lights are powered on and connected to the network"
            icon={Icon.LightBulb}
          />
        ) : (
          <>
            {lights.length > 1 && (
              <Grid.Section title="Quick Actions">
                <Grid.Item
                  title="All Lights"
                  subtitle={`${lights.length} total`}
                  content={{
                    source: Icon.LightBulb,
                    tintColor: lights.every((l: LIFXLight) => l.power) ? Color.Green : Color.SecondaryText,
                  }}
                  actions={<ActionPanel>{allLightsActions}</ActionPanel>}
                />
              </Grid.Section>
            )}
            <Grid.Section title="Your Lights" subtitle={`${lights.length} light${lights.length !== 1 ? "s" : ""}`}>
              {lights.map((light: LIFXLight) => (
                <LightGridItem key={light.id} light={light} client={client} onUpdate={refreshLights} />
              ))}
            </Grid.Section>
          </>
        )}
      </Grid>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search lights..."
      actions={
        lights.length === 0 && !isLoading ? (
          <ActionPanel>
            <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={refreshLights} />
            {commonActions}
          </ActionPanel>
        ) : undefined
      }
    >
      {lights.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No LIFX Lights Found"
          description="Make sure your lights are powered on and connected to the network"
          icon={Icon.LightBulb}
        />
      ) : (
        <>
          {lights.length > 1 && (
            <List.Section title="All Lights">
              <List.Item
                title={`Control All Lights (${lights.length} total)`}
                icon={Icon.LightBulb}
                accessories={[{ text: "Quick actions for all lights" }]}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section title="All Lights">
                      <Action
                        title="Turn All on"
                        icon={Icon.Power}
                        onAction={() => controlAllLights("on")}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                      />
                      <Action
                        title="Turn All off"
                        icon={Icon.XMarkCircle}
                        onAction={() => controlAllLights("off")}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section title="Set All Brightness">
                      <Action
                        title="All to 100%"
                        onAction={() => controlAllLights("brightness", 100)}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "1" }}
                      />
                      <Action
                        title="All to 75%"
                        onAction={() => controlAllLights("brightness", 75)}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "2" }}
                      />
                      <Action
                        title="All to 50%"
                        onAction={() => controlAllLights("brightness", 50)}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "3" }}
                      />
                      <Action
                        title="All to 25%"
                        onAction={() => controlAllLights("brightness", 25)}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "4" }}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section>
                      <Action
                        title="Refresh Lights"
                        icon={Icon.ArrowClockwise}
                        onAction={refreshLights}
                        shortcut={{ modifiers: ["cmd"], key: "r" }}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            </List.Section>
          )}
          <List.Section title="Individual Lights" subtitle={`${lights.length} light${lights.length !== 1 ? "s" : ""}`}>
            {lights.map((light: LIFXLight) => (
              <LightListItem key={light.id} light={light} client={client} onUpdate={refreshLights} />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}
