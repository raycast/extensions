import { EntityStandardActionSections } from "@components/entity";
import { ha } from "@lib/common";
import { State } from "@lib/haapi";
import { Action, ActionPanel, Color, Icon, popToRoot } from "@raycast/api";
import { range } from "lodash-es";
import { useState } from "react";

export function ClimateActionPanel(props: { state: State }) {
  const state = props.state;
  const entityID = state.entity_id;
  const tempStep = state.attributes.target_temp_step ?? 0.5;
  const minAllowedTemp = state.attributes.min_temp ?? 7;
  const maxAllowedTemp = state.attributes.max_temp ?? 35;
  // Sometimes, min_temp and max_temp are not multiples of tempStep.
  // Set the actual min and max to the nearest valid multiple of tempStep for consistency and display niceness.
  const minNormalizedTemp = Math.ceil(minAllowedTemp / tempStep) * tempStep;
  const maxNormalizedTemp = Math.floor(maxAllowedTemp / tempStep) * tempStep;
  const changeTempAllowed =
    state.state === "heat" || state.state === "cool" || state.state === "heat_cool" || state.state == "auto"
      ? true
      : false;
  const currentTempValue: number | undefined = state.attributes.temperature || undefined;
  const [currentTemp, setCurrentTemp] = useState<number | undefined>(currentTempValue);
  const upperTemp = currentTemp ? currentTemp + tempStep : undefined;
  const lowerTemp = currentTemp ? currentTemp - tempStep : undefined;

  const temps: number[] = range(minNormalizedTemp, maxNormalizedTemp, tempStep);

  const currentPresetMode = state.attributes.preset_mode ? state.attributes.preset_mode : "None";
  const preset_modes = state.attributes.preset_modes;

  return (
    <ActionPanel>
      <ActionPanel.Section title="Controls">
        {changeTempAllowed && (
          <ActionPanel.Submenu
            title={`Temperature (${currentTemp || "?"})`}
            shortcut={{ modifiers: ["cmd"], key: "t" }}
            icon={{ source: "temperature.png", tintColor: Color.PrimaryText }}
          >
            {temps.map((t) => (
              <Action
                key={t.toString()}
                title={t.toString()}
                onAction={async () => {
                  await ha.setClimateTemperature(entityID, t);
                  setCurrentTemp(t);
                }}
              />
            ))}
          </ActionPanel.Submenu>
        )}
        {state.attributes.hvac_modes && (
          <ActionPanel.Submenu
            title={`Operation (${state.state})`}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
            icon={{ source: Icon.Gear, tintColor: Color.PrimaryText }}
          >
            {state.attributes.hvac_modes?.map((o: string) => (
              <Action
                key={o}
                title={o}
                onAction={async () => {
                  await ha.setClimateOperation(entityID, o);
                  popToRoot();
                }}
              />
            ))}
          </ActionPanel.Submenu>
        )}

        {preset_modes && (
          <ActionPanel.Submenu
            title={`Preset (${currentPresetMode})`}
            shortcut={{ modifiers: ["cmd"], key: "p" }}
            icon={{ source: Icon.List, tintColor: Color.PrimaryText }}
          >
            {preset_modes?.map((o: string) => (
              <Action
                key={o}
                title={o}
                onAction={async () => {
                  await ha.setClimatePreset(entityID, o);
                  popToRoot();
                }}
              />
            ))}
          </ActionPanel.Submenu>
        )}

        {upperTemp && changeTempAllowed && (
          <Action
            title={`Increase Temp. ${tempStep}`}
            shortcut={{ modifiers: ["cmd"], key: "+" }}
            onAction={async () => {
              await ha.setClimateTemperature(entityID, upperTemp);
              setCurrentTemp(upperTemp);
            }}
            icon={{ source: "plus.png", tintColor: Color.PrimaryText }}
          />
        )}
        {lowerTemp && changeTempAllowed && (
          <Action
            title={`Decrease Temp. ${tempStep}`}
            shortcut={{ modifiers: ["cmd"], key: "-" }}
            onAction={async () => {
              await ha.setClimateTemperature(entityID, lowerTemp);
              setCurrentTemp(lowerTemp);
            }}
            icon={{ source: "minus.png", tintColor: Color.PrimaryText }}
          />
        )}
      </ActionPanel.Section>
      <EntityStandardActionSections state={state} />
    </ActionPanel>
  );
}
