import { MenuBarExtra, Icon, getPreferenceValues, open } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useInterval } from "usehooks-ts";
import { readTemperatures } from "./lib/temperature";
import { formatTemp, getSeverity, severityColor, severityLabel, parseThreshold } from "./lib/utils";
import { Preferences } from "./lib/types";
import { useTemperatureUnit } from "./lib/useTemperatureUnit";

export default function MenubarTemperature() {
  const prefs = getPreferenceValues<Preferences>();
  const warningThreshold = parseThreshold(prefs.warningThreshold, 80);
  const criticalThreshold = parseThreshold(prefs.criticalThreshold, 95);

  const { data, revalidate, isLoading } = usePromise(readTemperatures);
  const { unit, toggle } = useTemperatureUnit();

  useInterval(revalidate, 3000);

  const cpuSeverity = data
    ? getSeverity(data.cpuMain, warningThreshold, criticalThreshold)
    : "unavailable";

  const title = data?.sensorAvailable ? formatTemp(data.cpuMain, unit) : undefined;

  return (
    <MenuBarExtra
      icon={{ source: Icon.Temperature, tintColor: severityColor(cpuSeverity) }}
      title={title}
      tooltip="CPU Temperature"
      isLoading={isLoading}
    >
      <MenuBarExtra.Section title="CPU">
        <MenuBarExtra.Item
          icon={{ source: Icon.ComputerChip, tintColor: severityColor(cpuSeverity) }}
          title={`CPU: ${data ? formatTemp(data.cpuMain, unit) : "Loading..."}`}
          subtitle={severityLabel(cpuSeverity)}
        />
        {data && data.cpuMax > 0 && (
          <MenuBarExtra.Item title={`Max: ${formatTemp(data.cpuMax, unit)}`} />
        )}
      </MenuBarExtra.Section>

      {data && data.cpuSensors.length > 0 && (
        <MenuBarExtra.Submenu title="Die Sensors" icon={Icon.List}>
          {data.cpuSensors.map((sensor) => {
            const sensorSeverity = getSeverity(
              sensor.temperature,
              warningThreshold,
              criticalThreshold,
            );
            return (
              <MenuBarExtra.Item
                key={sensor.name}
                icon={{ source: Icon.CircleFilled, tintColor: severityColor(sensorSeverity) }}
                title={sensor.label}
                subtitle={formatTemp(sensor.temperature, unit)}
              />
            );
          })}
        </MenuBarExtra.Submenu>
      )}

      {data && data.gpuTemp > 0 && (
        <MenuBarExtra.Section title="GPU">
          <MenuBarExtra.Item
            icon={{
              source: Icon.Monitor,
              tintColor: severityColor(
                getSeverity(data.gpuTemp, warningThreshold, criticalThreshold),
              ),
            }}
            title={`GPU: ${formatTemp(data.gpuTemp, unit)}`}
            subtitle={severityLabel(getSeverity(data.gpuTemp, warningThreshold, criticalThreshold))}
          />
        </MenuBarExtra.Section>
      )}

      {data && !data.sensorAvailable && (
        <MenuBarExtra.Section title="Status">
          <MenuBarExtra.Item
            icon={Icon.ExclamationMark}
            title="Temperature sensors unavailable"
            subtitle={data.isAppleSilicon ? "Apple Silicon limitation" : "Sensor error"}
          />
        </MenuBarExtra.Section>
      )}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title={`Switch to ${unit === "celsius" ? "°F" : "°C"}`}
          icon={Icon.Switch}
          onAction={toggle}
        />
        <MenuBarExtra.Item
          title="Open Temp Check"
          icon={Icon.Eye}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
          onAction={() => open("raycast://extensions/ADCAdams/temp-check/temperature-monitor")}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
