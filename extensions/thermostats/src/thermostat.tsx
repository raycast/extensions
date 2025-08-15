/* eslint-disable @typescript-eslint/no-explicit-any */

import { Action, ActionPanel, List, showToast, Toast, closeMainWindow, LocalStorage, Detail } from "@raycast/api";
import { Seam } from "seam";
import { useState, useEffect } from "react";

// Utility function to retry API calls with exponential backoff
async function retryWithBackoff<T>(fn: () => Promise<T>, maxRetries: number = 3, baseDelay: number = 1000): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      // Don't retry for non-rate-limit errors on the last attempt
      if (attempt === maxRetries) {
        throw error;
      }

      // Only retry for rate limiting (429) or temporary errors (5xx)
      if (error.response?.status === 429 || (error.response?.status >= 500 && error.response?.status < 600)) {
        const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
        console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw error; // Don't retry for other types of errors
      }
    }
  }
  throw new Error("Max retries exceeded");
}

export default async function Command() {
  let seam: Seam;
  const [devices, setDevices] = useState<[string, string, string][]>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    async function onMounted() {
      const key = await LocalStorage.getItem<string>("seam_api_key");
      if (!key || key.length !== 38 || !key.startsWith("seam_")) {
        return <Detail markdown={`# Invalid API Key\n\nPlease set a valid Seam API key in your Raycast settings.`} />;
      }
      process.env["SEAM_API_KEY"] = key;
      seam = new Seam();

      try {
        setIsLoading(true);
        setError(undefined); // Clear any previous errors

        // Use retry logic with exponential backoff
        const devicesList = await retryWithBackoff(
          () => seam.devices.list(),
          3, // max 3 retries
          1000, // start with 1 second delay
        );

        setDevices(
          devicesList.map((d) => {
            return [
              d.device_id,
              d.display_name,
              d.properties.is_heating ? "Heating" : d.properties.is_cooling ? "Cooling" : "Off",
            ];
          }),
        );
      } catch (error: any) {
        console.error("Error fetching devices:", error);

        if (error.response?.status === 429) {
          const message = "Rate limit exceeded. Please wait a moment before trying again.";
          setError(message);
          await showToast({
            style: Toast.Style.Failure,
            title: "Rate Limit Exceeded",
            message: "Too many requests. Please wait before trying again.",
          });
        } else {
          const message = error.message || "Failed to fetch devices";
          setError(message);
          await showToast({
            style: Toast.Style.Failure,
            title: "Error",
            message,
          });
        }
      } finally {
        setIsLoading(false);
      }
    }

    onMounted();
  }, []); // Empty dependency array means this runs once on mount

  if (error) {
    return (
      <List>
        <List.Item title="Error loading devices" subtitle={error} icon="❌" />
      </List>
    );
  }

  // Create a proper component for the mode list that shares state
  const ModeList = ({ deviceId }: { deviceId: string }) => {
    // Local temperature state for this component
    const [localTemperature, setLocalTemperature] = useState(76);
    const [localCool, setLocalCool] = useState("Cool to 76");
    const [localHeat, setLocalHeat] = useState("Heat to 76");

    // Update display strings when temperature changes
    useEffect(() => {
      setLocalCool(`Cool to ${localTemperature}°F`);
      setLocalHeat(`Heat to ${localTemperature}°F`);
    }, [localTemperature]);

    const sendThermostatCommand = async (mode: string) => {
      await closeMainWindow();
      try {
        if (mode === "cool") {
          await seam.thermostats.cool({
            device_id: deviceId,
            cooling_set_point_fahrenheit: localTemperature,
          });
        } else if (mode === "heat") {
          await seam.thermostats.heat({
            device_id: deviceId,
            heating_set_point_fahrenheit: localTemperature,
          });
        } else {
          await seam.thermostats.off({
            device_id: deviceId,
          });
        }
        await showToast({
          style: Toast.Style.Success,
          title: {
            cool: `Cooling to ${localTemperature}°F`,
            heat: `Heating to ${localTemperature}°F`,
            off: "Thermostat turned off",
          }[mode]!,
        });
      } catch (error: any) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: "Failed to send thermostat command: " + (error.message || "Unknown error"),
        });
      }
    };

    const actions = (mode: string) => (
      <ActionPanel title="Thermostat Controls">
        <Action title="Send Command" onAction={() => sendThermostatCommand(mode)} />
        <Action
          title={`Lower Temperature (${localTemperature - 1}°F)`}
          shortcut={{ modifiers: [], key: "[" }}
          onAction={() => setLocalTemperature((prev) => prev - 1)}
        />
        <Action
          title={`Raise Temperature (${localTemperature + 1}°F)`}
          shortcut={{ modifiers: [], key: "]" }}
          onAction={() => setLocalTemperature((prev) => prev + 1)}
        />
      </ActionPanel>
    );

    return (
      <List>
        <List.Item title="Cool" subtitle={localCool} actions={actions("cool")} />
        <List.Item title="Heat" subtitle={localHeat} actions={actions("heat")} />
        <List.Item
          title="Off"
          subtitle="Turn off thermostat"
          actions={
            <ActionPanel title="Thermostat Controls">
              <Action title="Send Command" onAction={() => sendThermostatCommand("off")} />
            </ActionPanel>
          }
        />
      </List>
    );
  };

  return (
    <List isLoading={isLoading}>
      {devices
        ?.sort((a, b) => a[1].localeCompare(b[1]))
        .map(([id, name, subtitle]) => (
          <List.Item
            key={id}
            title={name}
            subtitle={subtitle}
            actions={
              <ActionPanel title="">
                <Action.Push title="See Actions" target={<ModeList deviceId={id} />} />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
