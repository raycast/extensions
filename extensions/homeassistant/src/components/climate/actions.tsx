import { EntityStandardActionSections } from "@components/entity";
import { ha } from "@lib/common";
import { State } from "@lib/haapi";
import { Action, ActionPanel, closeMainWindow, Color, Icon, showToast, Toast } from "@raycast/api";
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
            title={`Set Temperature`}
            icon={{ source: Icon.Temperature, tintColor: Color.PrimaryText }}
          >
            {temps.map((t) => (
              <Action
                key={t.toString()}
                title={t.toString()}
                onAction={async () => {
                  try {
                    await ha.setClimateTemperature(entityID, t);
                    setCurrentTemp(t);
                    showToast({ style: Toast.Style.Success, title: "Temperature set", message: t.toString() + "°" });
                  } catch (error) {
                    showToast({
                      style: Toast.Style.Failure,
                      title: "Failed to set temperature",
                      message: error instanceof Error ? error.message : String(error),
                    });
                  }
                }}
              />
            ))}
          </ActionPanel.Submenu>
        )}

        {state.attributes.hvac_modes && (
          <ActionPanel.Submenu title={`Set Operation Mode`} icon={{ source: Icon.Gear, tintColor: Color.PrimaryText }}>
            {state.attributes.hvac_modes?.map((o: string) => (
              <Action
                key={o}
                title={o}
                onAction={async () => {
                  try {
                    await ha.setClimateOperationMode(entityID, o);
                    await closeMainWindow();
                    showToast({ style: Toast.Style.Success, title: "Operation Mode set", message: o });
                  } catch (error) {
                    showToast({
                      style: Toast.Style.Failure,
                      title: "Failed to set operation mode",
                      message: error instanceof Error ? error.message : String(error),
                    });
                  }
                }}
              />
            ))}
          </ActionPanel.Submenu>
        )}

        {state.attributes.fan_modes && (
          <ActionPanel.Submenu
            title={`Set Fan Mode`}
            icon={{ source: Icon.Gear, tintColor: Color.PrimaryText }}
            shortcut={{ modifiers: ["cmd"], key: "f" }}
          >
            {state.attributes.fan_modes?.map((o: string) => (
              <Action
                key={o}
                title={o}
                onAction={async () => {
                  try {
                    await ha.setClimateFanMode(entityID, o);
                    showToast({ style: Toast.Style.Success, title: "Fan Mode set", message: o });
                  } catch (error) {
                    showToast({
                      style: Toast.Style.Failure,
                      title: "Failed to set fan mode",
                      message: error instanceof Error ? error.message : String(error),
                    });
                  }
                }}
              />
            ))}
          </ActionPanel.Submenu>
        )}

        {state.attributes.swing_modes && (
          <ActionPanel.Submenu
            title={`Set Swing Mode`}
            icon={{ source: Icon.Gear, tintColor: Color.PrimaryText }}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
          >
            {state.attributes.swing_modes?.map((o: string) => (
              <Action
                key={o}
                title={o}
                onAction={async () => {
                  try {
                    await ha.setClimateSwingMode(entityID, o);
                    showToast({ style: Toast.Style.Success, title: "Swing Mode set", message: o });
                  } catch (error) {
                    showToast({
                      style: Toast.Style.Failure,
                      title: "Failed to set swing mode",
                      message: error instanceof Error ? error.message : String(error),
                    });
                  }
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
                  try {
                    await ha.setClimatePreset(entityID, o);
                    showToast({ style: Toast.Style.Success, title: "Preset set", message: o });
                  } catch (error) {
                    showToast({
                      style: Toast.Style.Failure,
                      title: "Failed to set preset",
                      message: error instanceof Error ? error.message : String(error),
                    });
                  }
                }}
              />
            ))}
          </ActionPanel.Submenu>
        )}

        {upperTemp && changeTempAllowed && (
          <Action
            title={`Increase Temperature`}
            shortcut={{ modifiers: ["cmd"], key: "=" }}
            onAction={async () => {
              try {
                await ha.setClimateTemperature(entityID, upperTemp);
                setCurrentTemp(upperTemp);
                showToast({
                  style: Toast.Style.Success,
                  title: "Temperature set",
                  message: upperTemp.toString() + "°",
                });
              } catch (error) {
                showToast({
                  style: Toast.Style.Failure,
                  title: "Failed to increase temperature",
                  message: error instanceof Error ? error.message : String(error),
                });
              }
            }}
            icon={{ source: "plus.svg", tintColor: Color.PrimaryText }}
          />
        )}
        {lowerTemp && changeTempAllowed && (
          <Action
            title={`Decrease Temperature`}
            shortcut={{ modifiers: ["cmd"], key: "-" }}
            onAction={async () => {
              try {
                await ha.setClimateTemperature(entityID, lowerTemp);
                setCurrentTemp(lowerTemp);
                showToast({
                  style: Toast.Style.Success,
                  title: "Temperature set",
                  message: lowerTemp.toString() + "°",
                });
              } catch (error) {
                showToast({
                  style: Toast.Style.Failure,
                  title: "Failed to decrease temperature",
                  message: error instanceof Error ? error.message : String(error),
                });
              }
            }}
            icon={{ source: "minus.svg", tintColor: Color.PrimaryText }}
          />
        )}
      </ActionPanel.Section>
      <EntityStandardActionSections state={state} />
    </ActionPanel>
  );
}
