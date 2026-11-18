import { Action, ActionPanel, Icon, List, showToast, Toast, Color, confirmAlert } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useState } from "react";
import { discoverKeyLights } from "./utils";
import { KeyLight } from "./elgato";
import { getTargetConfig, saveTargetConfig, TargetMode } from "./target-config";

type DiscoveredLight = {
  id: string;
  title: string;
  address: string;
  subtitle?: string;
};

export default function ConfigureTargetLightsCommand() {
  const [isLoading, setIsLoading] = useState(true);
  const [mode, setMode] = useState<TargetMode>("all");
  const [selectedLights, setSelectedLights] = useState<string[]>([]);
  const [lights, setLights] = useState<DiscoveredLight[]>([]);

  async function loadConfigAndLights(forceRefresh = false) {
    setIsLoading(true);
    try {
      const config = await getTargetConfig();
      setMode(config.mode);
      setSelectedLights(config.selectedLights);

      await discoverKeyLights(forceRefresh);
      const discoveredLights = KeyLight.getDiscoveredLights().map((light) => ({
        id: light.service.referer.address,
        title: light.service.displayName || light.service.name,
        address: light.service.referer.address,
        subtitle: light.service.host,
      }));
      setLights(discoveredLights);
    } catch (error) {
      await showFailureToast(error, { title: "Failed to Load Lights" });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadConfigAndLights();
  }, []);

  async function persistConfig(nextMode: TargetMode, nextSelectedLights: string[]) {
    setMode(nextMode);
    setSelectedLights(nextSelectedLights);
    await saveTargetConfig({ mode: nextMode, selectedLights: nextSelectedLights });
  }

  async function handleModeChange(nextMode: string) {
    const normalizedMode: TargetMode = nextMode === "selected" ? "selected" : "all";
    await persistConfig(normalizedMode, selectedLights);
    await showToast({
      style: Toast.Style.Success,
      title: normalizedMode === "all" ? "Controlling all lights" : "Controlling selected lights",
    });
  }

  async function toggleLight(lightId: string) {
    const nextSelectedLights = selectedLights.includes(lightId)
      ? selectedLights.filter((id) => id !== lightId)
      : [...selectedLights, lightId];
    await persistConfig("selected", nextSelectedLights);
  }

  async function selectOnlyLight(lightId: string) {
    await persistConfig("selected", [lightId]);
  }

  async function clearSelection() {
    const confirmed = await confirmAlert({ title: "Clear selected lights?" });
    if (!confirmed) {
      return;
    }

    await persistConfig("selected", []);
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Configure Target Lights"
      searchBarPlaceholder="Search discovered lights..."
      searchBarAccessory={
        <List.Dropdown tooltip="Target Mode" value={mode} onChange={handleModeChange}>
          <List.Dropdown.Item title="All Lights" value="all" />
          <List.Dropdown.Item title="Selected Lights" value="selected" />
        </List.Dropdown>
      }
    >
      <List.Section title={mode === "all" ? "All Lights Mode" : "Selected Lights Mode"}>
        <List.Item
          title={
            mode === "all" ? "All discovered lights will be controlled" : "Only selected lights will be controlled"
          }
          icon={mode === "all" ? Icon.LightBulb : Icon.CheckCircle}
          accessories={
            mode === "selected"
              ? [{ text: `${selectedLights.length} selected` }]
              : [{ text: `${lights.length} discovered` }]
          }
          actions={
            <ActionPanel>
              <Action title="Discover Lights" icon={Icon.ArrowClockwise} onAction={() => loadConfigAndLights(true)} />
              {mode === "selected" ? (
                <Action title="Clear Selection" icon={Icon.XMarkCircle} onAction={clearSelection} />
              ) : null}
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Discovered Lights">
        {lights.map((light) => {
          const isSelected = selectedLights.includes(light.id);
          return (
            <List.Item
              key={light.id}
              title={light.title}
              subtitle={light.subtitle}
              icon={Icon.LightBulb}
              accessories={[
                { text: light.address },
                ...(isSelected
                  ? [{ icon: { source: Icon.CheckCircle, tintColor: Color.Green }, tooltip: "Selected" }]
                  : []),
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title={isSelected ? "Remove from Selected Lights" : "Add to Selected Lights"}
                    icon={isSelected ? Icon.MinusCircle : Icon.CheckCircle}
                    onAction={() => toggleLight(light.id)}
                  />
                  <Action title="Use Only This Light" icon={Icon.Dot} onAction={() => selectOnlyLight(light.id)} />
                  <Action
                    title="Set Mode to All Lights"
                    icon={Icon.LightBulb}
                    onAction={() => persistConfig("all", selectedLights)}
                  />
                  <Action
                    title="Discover Lights"
                    icon={Icon.ArrowClockwise}
                    onAction={() => loadConfigAndLights(true)}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
