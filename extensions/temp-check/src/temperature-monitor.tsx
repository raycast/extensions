import { List, Icon, Color, getPreferenceValues } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useInterval } from "usehooks-ts";
import { readTemperatures } from "./lib/temperature";
import { formatTemp, getSeverity, severityColor, severityLabel, parseThreshold } from "./lib/utils";
import { Preferences } from "./lib/types";
import { TempActions } from "./components/Actions";
import { useTemperatureUnit } from "./lib/useTemperatureUnit";

export default function TemperatureMonitor() {
  const prefs = getPreferenceValues<Preferences>();
  const warningThreshold = parseThreshold(prefs.warningThreshold, 80);
  const criticalThreshold = parseThreshold(prefs.criticalThreshold, 95);
  const refreshMs = parseInt(prefs.refreshInterval || "3", 10) * 1000;

  const { data, revalidate, isLoading } = usePromise(readTemperatures);
  const { unit, toggle } = useTemperatureUnit();

  useInterval(revalidate, refreshMs);

  const cpuSeverity = data
    ? getSeverity(data.cpuMain, warningThreshold, criticalThreshold)
    : "unavailable";
  const gpuSeverity =
    data && data.gpuTemp > 0
      ? getSeverity(data.gpuTemp, warningThreshold, criticalThreshold)
      : "unavailable";

  return (
    <List isShowingDetail isLoading={isLoading} filtering={false} searchBarPlaceholder="">
      <List.Section title="CPU">
        <List.Item
          id="cpu-main"
          icon={{ source: Icon.ComputerChip, tintColor: severityColor(cpuSeverity) }}
          title="CPU Temperature"
          accessories={[{ text: data ? formatTemp(data.cpuMain, unit) : "..." }]}
          actions={
            <TempActions
              copyValue={data ? formatTemp(data.cpuMain, unit) : "N/A"}
              unit={unit}
              onToggleUnit={toggle}
            />
          }
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label
                    title="Average"
                    text={data ? formatTemp(data.cpuMain, unit) : "--"}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Maximum"
                    text={data ? formatTemp(data.cpuMax, unit) : "--"}
                  />
                  <List.Item.Detail.Metadata.TagList title="Status">
                    <List.Item.Detail.Metadata.TagList.Item
                      text={severityLabel(cpuSeverity)}
                      color={severityColor(cpuSeverity)}
                    />
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Chip" text={data?.chipModel || "--"} />
                  <List.Item.Detail.Metadata.Label
                    title="CPU Cores"
                    text={data?.coreCount ? String(data.coreCount) : "--"}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Die Sensors"
                    text={
                      data?.dieSensorCount ? `${data.dieSensorCount} thermal sensors on chip` : "--"
                    }
                  />
                  <List.Item.Detail.Metadata.Separator />
                  {data && data.cpuSensors.length > 0 ? (
                    data.cpuSensors.map((sensor) => (
                      <List.Item.Detail.Metadata.Label
                        key={sensor.name}
                        title={sensor.label}
                        text={formatTemp(sensor.temperature, unit)}
                      />
                    ))
                  ) : (
                    <List.Item.Detail.Metadata.Label
                      title="Sensors"
                      text="No die sensor data available"
                    />
                  )}
                </List.Item.Detail.Metadata>
              }
            />
          }
        />
      </List.Section>

      <List.Section title="GPU">
        <List.Item
          id="gpu"
          icon={{ source: Icon.Monitor, tintColor: severityColor(gpuSeverity) }}
          title="GPU Temperature"
          accessories={[
            {
              text: data && data.gpuTemp > 0 ? formatTemp(data.gpuTemp, unit) : "N/A",
            },
          ]}
          actions={
            <TempActions
              copyValue={data && data.gpuTemp > 0 ? formatTemp(data.gpuTemp, unit) : "N/A"}
              unit={unit}
              onToggleUnit={toggle}
            />
          }
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label
                    title="Temperature"
                    text={
                      data && data.gpuTemp > 0 ? formatTemp(data.gpuTemp, unit) : "Not available"
                    }
                  />
                  {data && data.gpuTemp <= 0 && (
                    <List.Item.Detail.Metadata.Label
                      title="Note"
                      text={
                        data.isAppleSilicon
                          ? `${data.chipModel} has a unified chip — GPU shares the die with the CPU. Separate GPU temperature is not exposed.`
                          : "GPU temperature sensor not detected"
                      }
                    />
                  )}
                </List.Item.Detail.Metadata>
              }
            />
          }
        />
      </List.Section>

      {data && !data.sensorAvailable && (
        <List.Section title="Status">
          <List.Item
            id="status"
            icon={{ source: Icon.ExclamationMark, tintColor: Color.Orange }}
            title="Temperature Sensors Unavailable"
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label
                      title="Issue"
                      text="Cannot read temperature data"
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Possible Cause"
                      text={
                        data.isAppleSilicon
                          ? "Apple Silicon Macs may have limited sensor access"
                          : "The temperature sensor package may not be installed correctly"
                      }
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
          />
        </List.Section>
      )}
    </List>
  );
}
