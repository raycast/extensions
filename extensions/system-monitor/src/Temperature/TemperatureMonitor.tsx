import { Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useInterval } from "usehooks-ts";

import { Actions } from "../components/Actions";
import { getTemperatureData, formatTemperature, getSeverity, severityColor, severityLabel } from "./TemperatureUtils";

export default function TemperatureMonitor() {
  const { data, revalidate, isLoading } = usePromise(getTemperatureData);

  useInterval(revalidate, 3000);

  const severity = data ? getSeverity(data.cpuAverage) : "unavailable";

  return (
    <List.Item
      id="temperature"
      title="Temperature"
      icon={{ source: Icon.Temperature, tintColor: severityColor(severity) }}
      accessories={[{ text: data?.sensorAvailable ? formatTemperature(data.cpuAverage) : "Loading…" }]}
      detail={<TemperatureDetail data={data} isLoading={isLoading} />}
      actions={<Actions />}
    />
  );
}

function TemperatureDetail({ data, isLoading }: { data: Awaited<ReturnType<typeof getTemperatureData>> | undefined; isLoading: boolean }) {
  const severity = data ? getSeverity(data.cpuAverage) : "unavailable";
  const dieSensors = data?.sensors.filter((s) => s.name.toLowerCase().includes("tdie")) || [];

  return (
    <List.Item.Detail
      isLoading={isLoading}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="CPU Average"
            text={data ? formatTemperature(data.cpuAverage) : "--"}
          />
          <List.Item.Detail.Metadata.Label
            title="CPU Maximum"
            text={data ? formatTemperature(data.cpuMax) : "--"}
          />
          <List.Item.Detail.Metadata.TagList title="Status">
            <List.Item.Detail.Metadata.TagList.Item text={severityLabel(severity)} color={severityColor(severity)} />
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Chip" text={data?.chipModel || "--"} />
          <List.Item.Detail.Metadata.Label title="CPU Cores" text={data?.coreCount ? String(data.coreCount) : "--"} />
          <List.Item.Detail.Metadata.Label
            title="Die Sensors"
            text={data?.dieSensorCount ? `${data.dieSensorCount} thermal sensors on chip` : "--"}
          />
          <List.Item.Detail.Metadata.Separator />
          {dieSensors.length > 0 ? (
            dieSensors.map((sensor) => (
              <List.Item.Detail.Metadata.Label
                key={sensor.name}
                title={sensor.label}
                text={formatTemperature(sensor.temperature)}
              />
            ))
          ) : (
            <List.Item.Detail.Metadata.Label title="Sensors" text={data?.sensorAvailable === false ? "Temperature sensors unavailable" : "No die sensor data"} />
          )}
          {data && data.gpuAverage > 0 && (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="GPU Temperature" text={formatTemperature(data.gpuAverage)} />
            </>
          )}
          {data && data.gpuAverage <= 0 && data.isAppleSilicon && (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="GPU"
                text={`${data.chipModel} has a unified chip — GPU shares the die with the CPU`}
              />
            </>
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
