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
import { usePromise, useCachedPromise, withCache, showFailureToast } from "@raycast/utils";
import { useRef, useEffect } from "react";
import fetch from "node-fetch";
import { AQIReport, aqiFromPM } from "./purpleAir";

interface Preferences {
  sensor_index: string;
  api_key: string;
  read_keys: string;
  show_nearest: boolean;
  use_celsius: boolean;
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
  distance?: number; // Distance from user's location in km (for nearest sensor)
  latitude?: number;
  longitude?: number;
}

// Utility function to convert Fahrenheit to Celsius
function fahrenheitToCelsius(fahrenheit: number): number {
  return (fahrenheit - 32) * (5 / 9);
}

// Utility function to format temperature based on user preference
function formatTemperature(temperature: number, useCelsius: boolean): string {
  if (useCelsius) {
    const celsius = fahrenheitToCelsius(temperature);
    return `${celsius.toFixed(1)}°C`;
  }
  return `${temperature.toFixed(1)}°F`;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const api_key = preferences.api_key;
  const show_nearest = preferences.show_nearest !== false; // Default to true if not specified

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

  return <SensorList sensorIndices={sensorIndices} readKeys={readKeys} apiKey={api_key} showNearest={show_nearest} />;
}

function SensorList({
  sensorIndices,
  readKeys,
  apiKey,
  showNearest,
}: {
  sensorIndices: string[];
  readKeys: string[];
  apiKey: string;
  showNearest: boolean;
}) {
  const { push } = useNavigation();

  // Build the URL for multiple sensors
  const fields =
    "name,humidity,temperature,pm2.5,pm2.5_10minute,pm2.5_30minute,pm2.5_60minute,pm2.5_6hour,pm2.5_24hour,pm2.5_1week,location_type,latitude,longitude";
  const baseUrl = `https://api.purpleair.com/v1/sensors?show=${sensorIndices.join(",")}`;

  // Add read keys to the URL if available
  const url =
    readKeys.length > 0 ? `${baseUrl}&read_keys=${readKeys.join(",")}&fields=${fields}` : `${baseUrl}&fields=${fields}`;

  const abortable = useRef<AbortController | null>(null);
  const {
    isLoading,
    data: sensorsData,
    error,
  } = usePromise(
    async (url: string) => {
      abortable.current = new AbortController();
      const response = await fetch(url, {
        signal: abortable.current.signal,
        headers: { "X-API-Key": apiKey },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      // Parse response and process sensor data
      const responseJson = (await response.json()) as PurpleAirResponse;
      console.debug("PurpleAir response:", JSON.stringify(responseJson, null, 2));
      return processSensorsData(responseJson, sensorIndices);
    },
    [url],
    { abortable }
  );

  const sensors = sensorsData?.sensors;
  const missingSensors = sensorsData?.missingSensors;

  // Get user location data using our cached hook
  const { data: locationData, isLoading: isLocationLoading } = useCachedPromise(
    async () => {
      return await getUserLocation();
    },
    [],
    {
      keepPreviousData: true,
    }
  );

  // Use the location data to find the nearest sensor
  const { data: nearestSensor, isLoading: isNearestSensorLoading } = useCachedPromise(
    async (location, key) => {
      if (!location) return null;
      return await fetchNearestSensor(location.latitude, location.longitude, key);
    },
    [locationData, apiKey],
    {
      // Only execute if showNearest is true and we have location data
      execute: showNearest && !!locationData,
      keepPreviousData: true,
    }
  );

  // Auto-select if there's only one sensor
  useEffect(() => {
    if (sensorIndices.length === 1 && sensors && sensors.length > 0 && !isNearestSensorLoading) {
      const sensorData = sensors[0];
      push(<SensorDetail sensorData={sensorData} />);
    }
  }, [sensors, sensorIndices.length, isNearestSensorLoading]);

  // Create list items for both your sensors and the nearest location sensor
  const getSensorItems = () => {
    const items = [];

    // Only add the location-based sensor if showNearest is enabled
    if (showNearest) {
      if (isLocationLoading || isNearestSensorLoading) {
        items.push(
          <List.Item
            key="nearest-loading"
            title="Finding nearest sensor..."
            subtitle="Based on your location"
            icon={Icon.Pin}
            accessories={[{ icon: Icon.CircleProgress }]}
          />
        );
      } else if (nearestSensor) {
        items.push(
          <SensorListItem
            key={nearestSensor.sensorId}
            sensorData={nearestSensor}
            onSelect={() => push(<SensorDetail sensorData={nearestSensor} />)}
          />
        );
      }
    }

    // Add the user's configured sensors
    if (sensors) {
      items.push(
        ...sensors.map((sensorData) => (
          <SensorListItem
            key={sensorData.sensorId}
            sensorData={sensorData}
            onSelect={() => push(<SensorDetail sensorData={sensorData} />)}
          />
        ))
      );
    } else if (isLoading) {
      // Show loading items for user's sensors
      items.push(
        ...sensorIndices.map((sensorId) => (
          <List.Item key={sensorId} title={`Sensor ${sensorId}`} subtitle="Loading..." icon={Icon.CircleProgress} />
        ))
      );
    } else if (error) {
      // Show error items
      items.push(
        ...sensorIndices.map((sensorId) => (
          <List.Item key={sensorId} title={`Sensor ${sensorId}`} subtitle="Error loading" icon={Icon.ExclamationMark} />
        ))
      );
    }

    // Add missing sensors with more informative error messages
    if (missingSensors && missingSensors.length > 0) {
      items.push(
        ...missingSensors.map((missingSensor) => (
          <List.Item
            key={`missing-${missingSensor.sensorId}`}
            title={`Sensor ${missingSensor.sensorId}`}
            subtitle="Private Sensor needs a specific Read Key"
            icon={{ source: Icon.Lock, tintColor: "red" }}
            accessories={[
              { text: "Missing Data", icon: Icon.XmarkCircle },
              { tag: { value: "Add Read Key", color: "red" } },
            ]}
            actions={
              <ActionPanel>
                <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={() => openCommandPreferences()} />
                <Action.OpenInBrowser
                  title="Learn About Read Keys"
                  url="https://community.purpleair.com/t/making-api-calls-with-the-purpleair-api/180"
                />
              </ActionPanel>
            }
          />
        ))
      );
    }

    return items;
  };

  return (
    <List isLoading={isLoading} navigationTitle="PurpleAir Sensors">
      {getSensorItems()}
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

  const preferences = getPreferenceValues<Preferences>();

  return (
    <List.Item
      title={sensorData.name}
      subtitle={`AQI: ${sensorData.currentAQI.Number} - ${sensorData.currentAQI.Description}`}
      icon={getAQIIcon(sensorData.currentAQI.Description)}
      accessories={[
        ...(locationInfo.text ? [{ text: locationInfo.text, icon: locationInfo.icon }] : []),
        { text: `Temp: ${formatTemperature(sensorData.temperature, preferences.use_celsius)}` },
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

  const preferences = getPreferenceValues<Preferences>();

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
          <Detail.Metadata.Label
            title="Temperature"
            text={formatTemperature(sensorData.temperature, preferences.use_celsius)}
          />
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

// Define interfaces for the response types
interface PurpleAirResponse {
  fields: string[];
  data: (string | number)[][];
  // Add other fields if needed, like api_version, time_stamp, etc.
}

interface MissingSensorError {
  sensorId: string;
  isPrivate: boolean;
}

// Helper functions for processing sensor data
function processSensorsData(
  response: PurpleAirResponse,
  requestedSensorIds: string[]
): {
  sensors: SensorData[];
  missingSensors: MissingSensorError[];
} {
  if (!response || !response.fields || !response.data) {
    return {
      sensors: [],
      missingSensors: requestedSensorIds.map((id) => ({ sensorId: id, isPrivate: true })),
    };
  }

  // Get indices of fields we need
  const fields = response.fields;
  const fieldIndices: Record<string, number> = {};
  fields.forEach((field: string, index: number) => {
    fieldIndices[field] = index;
  });

  // Process each sensor
  const sensorsData: SensorData[] = [];
  const returnedSensorIds = new Set<string>();

  response.data.forEach((sensorArray: (string | number)[]) => {
    const sensorId = sensorArray[0].toString();
    returnedSensorIds.add(sensorId);

    const name = fieldIndices.name !== undefined ? (sensorArray[fieldIndices.name] as string) : "Unknown";

    // Apply humidity adjustment (+4%) to correct offset
    const rawHumidity = fieldIndices.humidity !== undefined ? (sensorArray[fieldIndices.humidity] as number) : 0;
    const humidity = Math.max(0, rawHumidity + 4); // Add 4% but ensure it doesn't go below 0

    // Apply temperature adjustment (-8°F) to correct permanent offset
    const rawTemperature =
      fieldIndices.temperature !== undefined ? (sensorArray[fieldIndices.temperature] as number) : 0;
    const temperature = rawTemperature - 8; // Subtract 8°F to adjust for permanent offset

    const locationType =
      fieldIndices.location_type !== undefined ? (sensorArray[fieldIndices.location_type] as number) : undefined;
    const latitude = fieldIndices.latitude !== undefined ? (sensorArray[fieldIndices.latitude] as number) : undefined;
    const longitude =
      fieldIndices.longitude !== undefined ? (sensorArray[fieldIndices.longitude] as number) : undefined;

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
      latitude,
      longitude,
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

  // Identify missing sensors - likely private ones without a read key
  const missingSensors: MissingSensorError[] = [];

  for (const requestedId of requestedSensorIds) {
    if (!returnedSensorIds.has(requestedId)) {
      missingSensors.push({
        sensorId: requestedId,
        isPrivate: true, // Assume it's private if it's missing
      });
    }
  }

  return { sensors: sensorsData, missingSensors };
}

// Helper function to fetch user's location with 1-hour cache
const getUserLocation = withCache(
  async () => {
    console.debug("Fetching user location from ipwho.is...");
    const response = await fetch("https://ipwho.is/");
    if (!response.ok) {
      console.debug("Location API Error:", response.status, response.statusText);
      showFailureToast("Failed to fetch location data");
      throw new Error("Failed to fetch location data");
    }

    const data = (await response.json()) as {
      success: boolean;
      city: string;
      region: string;
      country: string;
      latitude: number;
      longitude: number;
    };

    if (!data.success) {
      console.debug("Location data request unsuccessful:", data);
      throw new Error("Location data request was not successful");
    }

    console.debug(`User location: ${data.city}, ${data.region}, ${data.country} (${data.latitude}, ${data.longitude})`);

    return {
      latitude: data.latitude,
      longitude: data.longitude,
      city: data.city,
      region: data.region,
      country: data.country,
    };
  },
  {
    maxAge: 60 * 60 * 1000, // Cache for 1 hour (in milliseconds)
  }
);

// Helper function to fetch the nearest sensor with 1-hour cache
const fetchNearestSensor = withCache(
  async (lat: number, lon: number, apiKey: string) => {
    // Calculate a bounding box around the user's location (approximately 10km in each direction)
    const boxSize = 0.1; // Roughly 10km at most latitudes
    const nwLat = lat + boxSize;
    const nwLng = lon - boxSize;
    const seLat = lat - boxSize;
    const seLng = lon + boxSize;

    // Fields we want to request
    const fields =
      "name,latitude,longitude,pm2.5,humidity,temperature,pm2.5_10minute,pm2.5_30minute,pm2.5_60minute,pm2.5_6hour,pm2.5_24hour,pm2.5_1week,location_type";

    // Build the PurpleAir API URL with the bounding box
    const url = `https://api.purpleair.com/v1/sensors?fields=${fields}&nwlng=${nwLng}&nwlat=${nwLat}&selng=${seLng}&selat=${seLat}&max_age=3600&location_type=0`;

    console.debug("Fetching nearest sensor with URL:", url);

    const response = await fetch(url, {
      headers: { "X-API-Key": apiKey },
    });

    if (!response.ok) {
      console.debug("PurpleAir API Error:", response.status, response.statusText);
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const responseJson = await response.json();
    console.debug("PurpleAir nearest sensor response:", JSON.stringify(responseJson, null, 2));

    // For the nearest sensor, we don't need to track missing sensors
    // since we're just looking for any available sensor in the area
    const { sensors } = processSensorsData(responseJson as PurpleAirResponse, []);
    console.debug(`Found ${sensors.length} sensors in the area`);

    // Add distance to each sensor
    sensors.forEach((sensor) => {
      if (sensor.latitude && sensor.longitude) {
        sensor.distance = calculateDistance(lat, lon, sensor.latitude, sensor.longitude);
        console.debug(`Sensor ${sensor.name} is ${sensor.distance.toFixed(2)}km away`);
      } else {
        sensor.distance = Infinity;
      }
    });

    // Sort by distance and return the closest one
    sensors.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));

    if (sensors.length > 0) {
      console.debug(`Nearest sensor is ${sensors[0].name} at ${sensors[0].distance?.toFixed(2)}km`);
      return sensors[0];
    } else {
      console.debug("No sensors found in the area");
      return null;
    }
  },
  {
    maxAge: 60 * 60 * 1000, // Cache for 1 hour (in milliseconds)
  }
);

// Calculate distance between two points in km using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
