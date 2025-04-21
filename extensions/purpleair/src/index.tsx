import React, { useState } from "react";
import {
  ActionPanel,
  Action,
  Detail,
  getPreferenceValues,
  Icon,
  openCommandPreferences,
  closeMainWindow,
  PopToRootType,
  List,
  useNavigation,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useRef, useEffect } from "react";
import fetch from "node-fetch";
import { AQIReport, aqiFromPM } from "./purpleAir";

interface Preferences {
  sensor_index: string;
  api_key: string;
  read_keys: string;
}

interface SensorData {
  name: string;
  sensorId: string;
  humidity: number;
  temperature: number;
  pm25: number;
  pm25_10minute: number;
  pm25_30minute: number;
  pm25_60minute: number;
  pm25_6hour: number;
  pm25_24hour: number;
  pm25_1week: number;
  locationType?: number;
  currentAQI: AQIReport;
  aqi10Minutes: AQIReport;
  aqi30Minutes: AQIReport;
  aqi60Minutes: AQIReport;
  aqi6Hour: AQIReport;
  aqi24Hour: AQIReport;
  aqi1Week: AQIReport;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const api_key = preferences.api_key;

  // Parse comma-separated sensor indices
  const sensorIndices = preferences.sensor_index
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id !== "");

  // Parse comma-separated read keys
  const readKeys = preferences.read_keys
    ? preferences.read_keys
        .split(",")
        .map((key) => key.trim())
        .filter((key) => key !== "")
    : [];

  if (sensorIndices.length === 0) {
    return (
      <Detail
        markdown={"Please add at least one sensor index in extension preferences."}
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

  return <SensorList sensorIndices={sensorIndices} readKeys={readKeys} apiKey={api_key} />;
}

function SensorList({
  sensorIndices,
  readKeys,
  apiKey,
}: {
  sensorIndices: string[];
  readKeys: string[];
  apiKey: string;
}) {
  const { push } = useNavigation();
  
  // Build the URL for multiple sensors
  const fields =
    "name,humidity,temperature,pm2.5,pm2.5_10minute,pm2.5_30minute,pm2.5_60minute,pm2.5_6hour,pm2.5_24hour,pm2.5_1week,location_type";
  const baseUrl = `https://api.purpleair.com/v1/sensors?show=${sensorIndices.join(",")}`;

  // Add read keys to the URL if available
  const url =
    readKeys.length > 0 ? `${baseUrl}&read_keys=${readKeys.join(",")}&fields=${fields}` : `${baseUrl}&fields=${fields}`;

  const abortable = useRef<AbortController>();
  const {
    isLoading,
    data: sensors,
    error,
  } = usePromise(
    async (url: string) => {
      const response = await fetch(url, {
        signal: abortable.current?.signal,
        headers: { "X-API-Key": apiKey },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      // Parse response and process sensor data
      const responseJson = await response.json();
      return processSensorsData(responseJson);
    },
    [url],
    { abortable }
  );

  // Auto-select if there's only one sensor
  useEffect(() => {
    if (sensorIndices.length === 1 && sensors && sensors.length > 0) {
      const sensorData = sensors[0];
      push(<SensorDetail sensorData={sensorData} />);
    }
  }, [sensors, sensorIndices.length]);

  return (
    <List isLoading={isLoading}>
      {!isLoading && sensors
        ? sensors.map((sensorData) => (
            <SensorListItem
              key={sensorData.sensorId}
              sensorData={sensorData}
              onSelect={() => push(<SensorDetail sensorData={sensorData} />)}
            />
          ))
        : // Show loading items or error
          sensorIndices.map((sensorId) => (
            <List.Item
              key={sensorId}
              title={`Sensor ${sensorId}`}
              subtitle={error ? "Error loading" : "Loading..."}
              icon={error ? Icon.ExclamationMark : Icon.CircleProgress}
            />
          ))}
    </List>
  );
}

function SensorListItem({ sensorData, onSelect }: { sensorData: SensorData; onSelect: () => void }) {
  // Get the AQI icon based on the description
  const getAQIIcon = (description: string) => {
    if (description.includes("Good")) return { source: Icon.Checkmark, tintColor: "green" };
    if (description.includes("Moderate")) return { source: Icon.Checkmark, tintColor: "yellow" };
    if (description.includes("Unhealthy for Sensitive Groups"))
      return { source: Icon.ExclamationMark, tintColor: "orange" };
    if (description.includes("Unhealthy")) return { source: Icon.ExclamationMark, tintColor: "red" };
    if (description.includes("Very Unhealthy")) return { source: Icon.ExclamationMark, tintColor: "purple" };
    if (description.includes("Hazardous")) return { source: Icon.ExclamationMark, tintColor: "black" };
    return Icon.Circle;
  };

  // Get the location type icon (0 = outside, 1 = inside)
  const getLocationTypeIcon = () => {
    if (sensorData.locationType === 0) return { text: "Outside", icon: Icon.Sun };
    if (sensorData.locationType === 1) return { text: "Inside", icon: Icon.House };
    return { text: "", icon: undefined };
  };

  const locationInfo = getLocationTypeIcon();

  return (
    <List.Item
      title={sensorData.name}
      subtitle={`AQI: ${sensorData.currentAQI.Number} - ${sensorData.currentAQI.Description}`}
      icon={getAQIIcon(sensorData.currentAQI.Description)}
      accessories={[
        ...(locationInfo.text ? [{ text: locationInfo.text, icon: locationInfo.icon }] : []),
        { text: `Temp: ${sensorData.temperature}°` },
        { text: `Humidity: ${sensorData.humidity}%` },
      ]}
      actions={
        <ActionPanel>
          <Action title="View Details" onAction={onSelect} />
        </ActionPanel>
      }
    />
  );
}

function SensorDetail({ sensorData }: { sensorData: SensorData }) {
  const markdown = `The AQI for ${sensorData.name} is: ${sensorData.currentAQI.Number} - ${sensorData.currentAQI.Description}\n\n${sensorData.currentAQI.LongDescription}`;

  // Get the location type description
  const getLocationType = () => {
    if (sensorData.locationType === 0) return "Outside";
    if (sensorData.locationType === 1) return "Inside";
    return "Unknown";
  };

  return (
    <Detail
      isLoading={false}
      markdown={markdown}
      navigationTitle={sensorData.name}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Station Name" text={sensorData.name} />
          <Detail.Metadata.Label title="AQI" text={sensorData.currentAQI.Number.toString()} />
          <Detail.Metadata.Label title="Description" text={sensorData.currentAQI.Description} />
          <Detail.Metadata.Label title="Location Type" text={getLocationType()} />
          <Detail.Metadata.Label title="Temperature" text={sensorData.temperature.toString()} />
          <Detail.Metadata.Label title="Humidity" text={sensorData.humidity.toString()} />
          <Detail.Metadata.Label title="AQI - 10 Minutes" text={sensorData.aqi10Minutes.Number.toString()} />
          <Detail.Metadata.Label title="AQI - 30 Minutes" text={sensorData.aqi30Minutes.Number.toString()} />
          <Detail.Metadata.Label title="AQI - 60 Minutes" text={sensorData.aqi60Minutes.Number.toString()} />
          <Detail.Metadata.Label title="AQI - 6 Hours" text={sensorData.aqi6Hour.Number.toString()} />
          <Detail.Metadata.Label title="AQI - 24 Hours" text={sensorData.aqi24Hour.Number.toString()} />
          <Detail.Metadata.Label title="AQI - 1 Week" text={sensorData.aqi1Week.Number.toString()} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open PurpleAir Map" url="https://map.purpleair.com" />
            <Action title="Change Station ID" icon={Icon.Key} onAction={() => openCommandPreferences()} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

// Helper functions for processing sensor data
function processSensorsData(response: any): SensorData[] {
  if (!response || !response.fields || !response.data) {
    return [];
  }

  // Get indices of fields we need
  const fields = response.fields;
  const fieldIndices: Record<string, number> = {};
  fields.forEach((field: string, index: number) => {
    fieldIndices[field] = index;
  });

  // Process each sensor
  const sensorsData: SensorData[] = [];
  response.data.forEach((sensorArray: any[]) => {
    const sensorId = sensorArray[0].toString();
    const name = fieldIndices.name !== undefined ? (sensorArray[fieldIndices.name] as string) : "Unknown";
    const humidity = fieldIndices.humidity !== undefined ? (sensorArray[fieldIndices.humidity] as number) : 0;
    const temperature = fieldIndices.temperature !== undefined ? (sensorArray[fieldIndices.temperature] as number) : 0;
    const locationType =
      fieldIndices.location_type !== undefined ? (sensorArray[fieldIndices.location_type] as number) : undefined;

    // PM2.5 values
    const pm25 = fieldIndices["pm2.5"] !== undefined ? (sensorArray[fieldIndices["pm2.5"]] as number) : 0;
    const pm25_10minute =
      fieldIndices["pm2.5_10minute"] !== undefined ? (sensorArray[fieldIndices["pm2.5_10minute"]] as number) : 0;
    const pm25_30minute =
      fieldIndices["pm2.5_30minute"] !== undefined ? (sensorArray[fieldIndices["pm2.5_30minute"]] as number) : 0;
    const pm25_60minute =
      fieldIndices["pm2.5_60minute"] !== undefined ? (sensorArray[fieldIndices["pm2.5_60minute"]] as number) : 0;
    const pm25_6hour =
      fieldIndices["pm2.5_6hour"] !== undefined ? (sensorArray[fieldIndices["pm2.5_6hour"]] as number) : 0;
    const pm25_24hour =
      fieldIndices["pm2.5_24hour"] !== undefined ? (sensorArray[fieldIndices["pm2.5_24hour"]] as number) : 0;
    const pm25_1week =
      fieldIndices["pm2.5_1week"] !== undefined ? (sensorArray[fieldIndices["pm2.5_1week"]] as number) : 0;

    // Calculate AQI values
    const currentAQI = aqiFromPM(pm25, humidity);
    const aqi10Minutes = aqiFromPM(pm25_10minute, humidity);
    const aqi30Minutes = aqiFromPM(pm25_30minute, humidity);
    const aqi60Minutes = aqiFromPM(pm25_60minute, humidity);
    const aqi6Hour = aqiFromPM(pm25_6hour, humidity);
    const aqi24Hour = aqiFromPM(pm25_24hour, humidity);
    const aqi1Week = aqiFromPM(pm25_1week, humidity);

    sensorsData.push({
      sensorId,
      name,
      humidity,
      temperature,
      locationType,
      pm25,
      pm25_10minute,
      pm25_30minute,
      pm25_60minute,
      pm25_6hour,
      pm25_24hour,
      pm25_1week,
      currentAQI,
      aqi10Minutes,
      aqi30Minutes,
      aqi60Minutes,
      aqi6Hour,
      aqi24Hour,
      aqi1Week,
    });
  });

  return sensorsData;
}
