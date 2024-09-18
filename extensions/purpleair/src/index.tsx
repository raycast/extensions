import {
  ActionPanel,
  Action,
  Detail,
  getPreferenceValues,
  Icon,
  openCommandPreferences,
  closeMainWindow,
  PopToRootType,
} from "@raycast/api";
import { PurpleAir } from "./purpleAir";
import { usePromise } from "@raycast/utils";
import { useRef } from "react";
import fetch from "node-fetch";

interface Preferences {
  sensor_index: string;
  api_key: string;
}

export default function Command() {
  let markdown = "";

  const preferences = getPreferenceValues<Preferences>();
  const url = `https://api.purpleair.com/v1/sensors/${preferences.sensor_index}/?api_key=${preferences.api_key}`;

  // figure out how to move to using useFetch https://developers.raycast.com/utilities/react-hooks/usefetch
  const abortable = useRef<AbortController>();
  const { isLoading, data, revalidate } = usePromise(
    async (url: string) => {
      const response = await fetch(url, { signal: abortable.current?.signal });
      if (!response.ok) {
        throw new Error(response.statusText);
      }

      return new PurpleAir(await response.text());
    },
    [url],
    {
      abortable,
    }
  );

  if (!isLoading && data === undefined) {
    return (
      <Detail
        markdown={"API key incorrect. Please update it in extension preferences and try again."}
        actions={
          <ActionPanel>
            <Action
              title="Open Preferences"
              onAction={async () => {
                await openCommandPreferences();
                await closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
              }}
            ></Action>
          </ActionPanel>
        }
      />
    );
  }

  if (data != null) {
    markdown = data?.getAirQualitySummary();
    markdown += "\n\n";
    markdown += data?.currentAQI.LongDescription;
  }

  if (!isLoading) {
    return (
      <Detail
        isLoading={isLoading}
        markdown={markdown}
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.Label title="Station Name" text={data?.purpleSensor.sensor.name.toString()} />
            <Detail.Metadata.Label title="AQI" text={data?.currentAQI.Number.toString()} />
            <Detail.Metadata.Label title="Description" text={data?.currentAQI.Description} />
            <Detail.Metadata.Label title="Tempurature" text={data?.purpleSensor.sensor.temperature.toString()} />
            <Detail.Metadata.Label title="Humidity" text={data?.purpleSensor.sensor.humidity.toString()} />
            <Detail.Metadata.Label title="AQI - 10 Minutes" text={data?.AQI_10Minutes.Number.toString()} />
            <Detail.Metadata.Label title="AQI - 30 Minutes" text={data?.AQI_30Minutes.Number.toString()} />
            <Detail.Metadata.Label title="AQI - 60 Minutes" text={data?.AQI_60Minutes.Number.toString()} />
            <Detail.Metadata.Label title="AQI - 6 Hours" text={data?.AQI_6Hour.Number.toString()} />
            <Detail.Metadata.Label title="AQI - 24 Hours" text={data?.AQI_24Hour.Number.toString()} />
            <Detail.Metadata.Label title="AQI - 1 Week" text={data?.AQI_1Week.Number.toString()} />
          </Detail.Metadata>
        }
        actions={
          <ActionPanel>
            <Action title="Reload" icon={Icon.ArrowClockwise} onAction={() => revalidate()} />
            <Action.OpenInBrowser title="Open PurpleAir Map" url="https://map.purpleair.com" />
            <Action title="Change Station ID" icon={Icon.Key} onAction={() => openCommandPreferences()} />
          </ActionPanel>
        }
      />
    );
  }
}
