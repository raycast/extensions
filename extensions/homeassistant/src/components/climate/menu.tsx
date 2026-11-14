import { MenuBarSubmenu } from "@components/menu";
import { ha } from "@lib/common";
import { State } from "@lib/haapi";
import { getErrorMessage } from "@lib/utils";
import { Icon, launchCommand, LaunchType, MenuBarExtra, showHUD } from "@raycast/api";
import { climateLabel, climateOptions, climateTemperature, climateTemperatures } from "./utils";

export function ACControls({ state, available }: { state: State; available: boolean }) {
  async function callClimateService(service: string, data: Record<string, string | number>) {
    try {
      await ha.post(`services/climate/${service}`, { entity_id: state.entity_id, ...data });
    } catch (error) {
      await showHUD(`AC control failed: ${getErrorMessage(error)}`);
      return;
    }
    try {
      await ha.post("services/homeassistant/update_entity", { entity_id: state.entity_id });
      await launchCommand({ name: "acmenu", type: LaunchType.Background });
    } catch {
      await showHUD("AC command sent, but status refresh failed.");
    }
  }

  if (!available) return null;

  const modes = climateOptions(state.attributes.hvac_modes);
  const temperatures = climateTemperatures(state);
  const targetTemperature = state.attributes.temperature;
  const coolerTemperature = temperatures.findLast((value) => value < targetTemperature);
  const warmerTemperature = temperatures.find((value) => value > targetTemperature);
  const controls = [
    {
      title: "Mode",
      icon: Icon.Gear,
      options: modes,
      current: state.state,
      service: "set_hvac_mode",
      field: "hvac_mode",
    },
    {
      title: "Fan",
      icon: Icon.Wind,
      options: climateOptions(state.attributes.fan_modes),
      current: state.attributes.fan_mode,
      service: "set_fan_mode",
      field: "fan_mode",
    },
    {
      title: "Swing",
      icon: Icon.ArrowUp,
      options: climateOptions(state.attributes.swing_modes),
      current: state.attributes.swing_mode,
      service: "set_swing_mode",
      field: "swing_mode",
    },
    {
      title: "Horizontal Swing",
      icon: Icon.ArrowRight,
      options: climateOptions(state.attributes.swing_horizontal_modes),
      current: state.attributes.swing_horizontal_mode,
      service: "set_swing_horizontal_mode",
      field: "swing_horizontal_mode",
    },
    {
      title: "Preset",
      icon: Icon.Stars,
      options: climateOptions(state.attributes.preset_modes),
      current: state.attributes.preset_mode,
      service: "set_preset_mode",
      field: "preset_mode",
    },
  ];

  return (
    <>
      {(state.state === "off" || modes.includes("off")) && (
        <MenuBarExtra.Item
          title={state.state === "off" ? "Turn On · Cool" : "Turn Off"}
          icon={Icon.Power}
          onAction={() => callClimateService("set_hvac_mode", { hvac_mode: state.state === "off" ? "cool" : "off" })}
        />
      )}
      {temperatures.length > 0 && (
        <MenuBarSubmenu
          title="Temperature"
          subtitle={climateTemperature(state, targetTemperature)}
          icon={Icon.Temperature}
        >
          <MenuBarExtra.Item
            title="Warmer"
            subtitle={warmerTemperature === undefined ? undefined : climateTemperature(state, warmerTemperature)}
            icon={Icon.Plus}
            onAction={
              warmerTemperature === undefined
                ? undefined
                : () => callClimateService("set_temperature", { temperature: warmerTemperature })
            }
          />
          <MenuBarExtra.Item
            title="Cooler"
            subtitle={coolerTemperature === undefined ? undefined : climateTemperature(state, coolerTemperature)}
            icon={Icon.Minus}
            onAction={
              coolerTemperature === undefined
                ? undefined
                : () => callClimateService("set_temperature", { temperature: coolerTemperature })
            }
          />
          <MenuBarExtra.Section title="Set Temperature">
            {temperatures.map((temperature) => (
              <MenuBarExtra.Item
                key={temperature}
                title={climateTemperature(state, temperature)}
                icon={temperature === targetTemperature ? Icon.Checkmark : undefined}
                onAction={() => callClimateService("set_temperature", { temperature })}
              />
            ))}
          </MenuBarExtra.Section>
        </MenuBarSubmenu>
      )}
      {controls
        .filter((control) => control.options.length > 0)
        .map((control) => (
          <MenuBarSubmenu
            key={control.field}
            title={control.title}
            subtitle={typeof control.current === "string" ? climateLabel(control.current) : undefined}
            icon={control.icon}
          >
            {control.options.map((value) => (
              <MenuBarExtra.Item
                key={value}
                title={climateLabel(value)}
                icon={control.current === value ? Icon.Checkmark : undefined}
                onAction={() => callClimateService(control.service, { [control.field]: value })}
              />
            ))}
          </MenuBarSubmenu>
        ))}
    </>
  );
}
