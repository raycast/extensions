import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { AirconModeType, Appliance, Cloud } from "nature-remo";
import { useMemo } from "react";
import { getPreferences } from "../lib/preferences";
import { invalidate } from "../lib/useCache";
import { capitalize } from "../lib/utils";

type UIModeType = AirconModeType | "off";

function useNatureRemo() {
  const { apiKey } = getPreferences();
  const client = useMemo<Cloud>(() => new Cloud(apiKey), [apiKey]);

  return client;
}

export function AC({ appliance: { id, nickname, device, aircon, settings } }: { appliance: Appliance }) {
  if (!(aircon && settings)) return <List.Item title="Invalid appliance" />;

  const client = useNatureRemo();
  const isPoweredOff = useMemo(() => settings.button === "power-off", [settings.button]);
  const modes = useMemo(() => [...Object.keys(aircon.range.modes), "off"] as UIModeType[], [aircon.range.modes]);
  const modeSettings = useMemo(() => aircon.range.modes[settings.mode], [settings.mode]);
  const tempUnit = useMemo(() => (settings.temp_unit === "c" ? "℃" : "°F"), [settings.temp_unit]);

  const accessories = useMemo(
    () =>
      isPoweredOff
        ? [{ text: "Powered Off" }]
        : [
            {
              text: settings.vol,
              icon: Icon.ArrowClockwise,
            },
            {
              text: settings.temp + tempUnit,
            },
            { text: capitalize(settings.mode) },
          ],
    [isPoweredOff, tempUnit, settings.temp, settings.mode]
  );

  async function setMode(mode: UIModeType) {
    await client.updateAirconSettings(
      id,
      mode === "off"
        ? {
            button: "power-off",
          }
        : {
            operation_mode: mode,
          }
    );

    await invalidate("appliances");
  }

  async function setTemp(temperature: string) {
    await client.updateAirconSettings(id, {
      temperature,
    });

    await invalidate("appliances");
  }

  async function setVol(airVolume: string) {
    await client.updateAirconSettings(id, {
      air_volume: airVolume,
    });

    await invalidate("appliances");
  }

  return (
    <List.Item
      title={nickname}
      subtitle={device.name}
      accessories={accessories}
      icon={Icon.Globe}
      actions={
        <ActionPanel>
          {!isPoweredOff && (
            <>
              <ActionPanel.Submenu title="Temperature">
                {modeSettings.temp.map((temp) => (
                  <Action key={temp} title={`${temp}${tempUnit}`} onAction={() => setTemp(temp)} />
                ))}
              </ActionPanel.Submenu>
              <ActionPanel.Submenu title="Volume">
                {modeSettings.vol.map((vol) => (
                  <Action key={vol} title={vol} onAction={() => setVol(vol)} />
                ))}
              </ActionPanel.Submenu>
            </>
          )}
          <ActionPanel.Submenu title="Mode">
            {modes.map((mode) => (
              <Action key={mode} title={capitalize(mode)} onAction={() => setMode(mode)} />
            ))}
          </ActionPanel.Submenu>
        </ActionPanel>
      }
    />
  );
}
