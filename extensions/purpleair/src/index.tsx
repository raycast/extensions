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
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useRef, useState } from "react";
import fetch from "node-fetch";

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

interface AQIReport {
  Number: number;
  Description: string;
  LongDescription: string;
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
  const [selectedSensor, setSelectedSensor] = useState<string | null>(null);

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
  if (sensorIndices.length === 1 && !selectedSensor && sensors && sensors.length > 0) {
    setSelectedSensor(sensors[0].sensorId);
  }

  // If a sensor is selected, show the detail view
  if (selectedSensor && sensors) {
    const sensorData = sensors.find((s) => s.sensorId === selectedSensor);
    if (sensorData) {
      return (
        <SensorDetail sensorData={sensorData} onBack={() => (sensors.length > 1 ? setSelectedSensor(null) : null)} />
      );
    }
  }

  return (
    <List isLoading={isLoading}>
      {!isLoading && sensors
        ? sensors.map((sensorData) => (
            <SensorListItem
              key={sensorData.sensorId}
              sensorData={sensorData}
              onSelect={() => setSelectedSensor(sensorData.sensorId)}
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

function SensorDetail({ sensorData, onBack }: { sensorData: SensorData; onBack: () => void }) {
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
          {onBack && <Action title="Back to List" icon={Icon.ArrowLeft} onAction={onBack} />}
          <Action.OpenInBrowser title="Open PurpleAir Map" url="https://map.purpleair.com" />
          <Action title="Change Station ID" icon={Icon.Key} onAction={() => openCommandPreferences()} />
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

// AQI calculation functions
function aqiFromPM(pm: number, humidity: number): AQIReport {
  const r: AQIReport = {
    Number: 0,
    Description: "",
    LongDescription: "",
  };

  pm = calculateEPAValue(pm, humidity);

  if (pm > 350.5) {
    r.Number = calcAQI(pm, 500, 401, 500.4, 350.5);
    r.Description = "⚫ Hazardous";
    r.LongDescription =
      ">300: Health warning of emergency conditions: everyone is more likely to be affected with 24 hours of exposure.";
  } else if (pm > 250.5) {
    r.Number = calcAQI(pm, 400, 301, 350.4, 250.5);
    r.Description = "💀 Hazardous";
    r.LongDescription =
      ">300: Health warning of emergency conditions: everyone is more likely to be affected with 24 hours of exposure.";
  } else if (pm > 150.5) {
    r.Number = calcAQI(pm, 300, 201, 250.4, 150.5);
    r.Description = "🟤 Very Unhealthy";
    r.LongDescription =
      "201-300: Health alert: The risk of health effects is increased for everyone with 24 hours of exposure.";
  } else if (pm > 55.5) {
    r.Number = calcAQI(pm, 200, 151, 150.4, 55.5);
    r.Description = "🔴 Unhealthy";
    r.LongDescription =
      "151-200: Some members of the general public may experience health effects with 24 hours of exposure; members of sensitive groups may experience more serious health effects.";
  } else if (pm > 35.5) {
    r.Number = calcAQI(pm, 150, 101, 55.4, 35.5);
    r.Description = "🟠 Unhealthy for Sensitive Groups";
    r.LongDescription =
      "101-150: Members of sensitive groups may experience health effects with 24 hours of exposure. The general public is less likely to be affected.";
  } else if (pm > 12.1) {
    r.Number = calcAQI(pm, 100, 51, 35.4, 12.1);
    r.Description = "🟡 Moderate";
    r.LongDescription =
      "51-100: Air quality is acceptable. However, there may be a risk for some people with 24 hours of exposure, particularly those who are unusually sensitive to air pollution.";
  } else if (pm >= 0) {
    r.Number = calcAQI(pm, 50, 0, 12, 0);
    r.Description = "🟢 Good";
    r.LongDescription =
      "0-50: Air quality is satisfactory, and air pollution poses little or no risk with 24 hours of exposure.";
  } else {
    r.Number = 0;
    r.Description = "undefined";
  }
  return r;
}

function calcAQI(Cp: number, Ih: number, Il: number, BPh: number, BPl: number) {
  const a = Ih - Il;
  const b = BPh - BPl;
  const c = Cp - BPl;
  return Math.round((a / b) * c + Il);
}

function calculateEPAValue(pm2_5_atm: number, RH: number): number {
  if (pm2_5_atm >= 0 && pm2_5_atm < 30) {
    return 0.524 * pm2_5_atm - 0.0862 * RH + 5.75;
  } else if (pm2_5_atm >= 30 && pm2_5_atm < 50) {
    return (0.786 * (pm2_5_atm / 20 - 3 / 2) + 0.524 * (1 - (pm2_5_atm / 20 - 3 / 2))) * pm2_5_atm - 0.0862 * RH + 5.75;
  } else if (pm2_5_atm >= 50 && pm2_5_atm < 210) {
    return 0.786 * pm2_5_atm - 0.0862 * RH + 5.75;
  } else if (pm2_5_atm >= 210 && pm2_5_atm < 260) {
    return (
      (0.69 * (pm2_5_atm / 50 - 21 / 5) + 0.786 * (1 - (pm2_5_atm / 50 - 21 / 5))) * pm2_5_atm -
      0.0862 * RH * (1 - (pm2_5_atm / 50 - 21 / 5)) +
      2.966 * (pm2_5_atm / 50 - 21 / 5) +
      5.75 * (1 - (pm2_5_atm / 50 - 21 / 5)) +
      8.84 * Math.pow(10, -4) * Math.pow(pm2_5_atm, 2) * (pm2_5_atm / 50 - 21 / 5)
    );
  } else if (pm2_5_atm >= 260) {
    return 2.966 + 0.69 * pm2_5_atm + 8.84 * Math.pow(10, -4) * Math.pow(pm2_5_atm, 2);
  }

  // Default return statement
  return pm2_5_atm;
}
