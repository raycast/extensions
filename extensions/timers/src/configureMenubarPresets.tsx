import useTimers from "./hooks/useTimers";
import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useEffect } from "react";
import useDefaultPresetVisibles from "./hooks/useDefaultPresetVisibles";
import { formatTime } from "./backend/formatUtils";

export default function Command() {
  const { customTimers, isLoading, refreshTimers, handleToggleCTVisibility } = useTimers();
  const { defaultPresets, defaultVisibles, isLoadingVisibles, refreshDefaultVisibles, handleDefaultPresetToggle } =
    useDefaultPresetVisibles();
  const hiddenTag = { tag: { value: "Hidden", color: Color.Red } };
  const visibleTag = { tag: { value: "Visible", color: Color.Green } };

  useEffect(() => {
    refreshTimers();
    refreshDefaultVisibles();
  }, []);

  return (
    <List isLoading={isLoading && isLoadingVisibles}>
      <List.Section title={"Custom Presets"}>
        {Object.keys(customTimers)
          .sort((a, b) => {
            return customTimers[a].timeInSeconds - customTimers[b].timeInSeconds;
          })
          .map((ctID) => (
            <List.Item
              key={ctID}
              title={customTimers[ctID].name}
              subtitle={formatTime(customTimers[ctID].timeInSeconds)}
              icon={Icon.Clock}
              accessories={[customTimers[ctID].showInMenuBar ? visibleTag : hiddenTag]}
              actions={
                <ActionPanel>
                  <Action
                    title={customTimers[ctID].showInMenuBar ? "Hide In Menu Bar" : "Show In Menu Bar"}
                    onAction={() => handleToggleCTVisibility(ctID)}
                  />
                </ActionPanel>
              }
            />
          ))}
      </List.Section>
      <List.Section title={"Default Presets"}>
        {defaultPresets.map((defaultPreset) => (
          <List.Item
            key={defaultPreset.key}
            title={defaultPreset.title}
            icon={Icon.Hourglass}
            accessories={[defaultVisibles?.[defaultPreset.key] ? visibleTag : hiddenTag]}
            actions={
              <ActionPanel>
                <Action
                  title={defaultVisibles?.[defaultPreset.key] ? "Hide In Menu Bar" : "Show In Menu Bar"}
                  onAction={() => handleDefaultPresetToggle(defaultPreset.key)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
