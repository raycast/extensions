import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Icon,
  getPreferenceValues,
  LaunchType,
  launchCommand,
  openExtensionPreferences,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { LocalStorage } from "@raycast/api";
import { getMetroLines, fetchStopsForLine, MetroLine, fetchDirectionsForStop } from "./api/prim";
import { StopAreaFull, Preferences, StopConfig } from "./api/types";

const STOP_CONFIG_KEY = "stop_config";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const { apiKey } = preferences;

  // Get metro lines (hardcoded for reliability)
  const lines: MetroLine[] = getMetroLines();

  const [stops, setStops] = useState<StopAreaFull[]>([]);
  const [directions, setDirections] = useState<string[]>([]);
  const [selectedLine, setSelectedLine] = useState<string>("");
  const [selectedStop, setSelectedStop] = useState<string>("");
  const [selectedDirections, setSelectedDirections] = useState<string[]>([]);
  const [walkingTime, setWalkingTime] = useState<string>("");
  const [isLoadingStops, setIsLoadingStops] = useState(false);
  const [isLoadingDirections, setIsLoadingDirections] = useState(false);
  const [lineError, setLineError] = useState<string | undefined>();
  const [stopError, setStopError] = useState<string | undefined>();
  const [walkingTimeError, setWalkingTimeError] = useState<string | undefined>();

  if (!apiKey || apiKey.trim() === "") {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            <Action.OpenInBrowser title="Get API Key from PRIM" url="https://prim.iledefrance-mobilites.fr/" />
          </ActionPanel>
        }
      >
        <Form.Description
          title="API Key Required"
          text="Please configure your PRIM API key in extension preferences to continue."
        />
      </Form>
    );
  }

  useEffect(() => {
    if (!selectedLine) {
      setStops([]);
      setDirections([]);
      return;
    }

    async function loadStops() {
      try {
        setIsLoadingStops(true);
        setStops([]);
        setSelectedStop("");
        setDirections([]);
        setSelectedDirections([]);
        const lineStops = await fetchStopsForLine(selectedLine, apiKey);
        setStops(lineStops);
      } catch (error) {
        console.error("Failed to fetch stops:", error);
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load stops",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsLoadingStops(false);
      }
    }
    loadStops();
  }, [selectedLine, apiKey]);

  useEffect(() => {
    if (!selectedStop || !selectedLine) {
      setDirections([]);
      return;
    }

    async function loadDirections() {
      try {
        setIsLoadingDirections(true);
        setDirections([]);
        setSelectedDirections([]);
        const lineCode = lines.find((l) => l.id === selectedLine)?.code || "";
        const availableDirections = await fetchDirectionsForStop(selectedStop, apiKey, lineCode);
        setDirections(availableDirections);
      } catch (error) {
        console.error("Failed to fetch directions:", error);
      } finally {
        setIsLoadingDirections(false);
      }
    }
    loadDirections();
  }, [selectedStop, selectedLine, apiKey]);

  function validateLine(value: string | undefined) {
    if (!value) {
      setLineError("Please select a metro line");
      return false;
    }
    setLineError(undefined);
    return true;
  }

  function validateStop(value: string | undefined) {
    if (!value) {
      setStopError("Please select a stop");
      return false;
    }
    setStopError(undefined);
    return true;
  }

  function validateWalkingTime(value: string | undefined) {
    if (!value || value.trim() === "") {
      setWalkingTimeError(undefined);
      return true;
    }
    const parsed = parseInt(value, 10);
    if (isNaN(parsed) || parsed < 0 || parsed > 60) {
      setWalkingTimeError("Please enter a valid number between 0 and 60");
      return false;
    }
    setWalkingTimeError(undefined);
    return true;
  }

  async function handleSubmit() {
    const isLineValid = validateLine(selectedLine);
    const isStopValid = validateStop(selectedStop);
    const isWalkingTimeValid = validateWalkingTime(walkingTime);

    if (!isLineValid || !isStopValid || !isWalkingTimeValid) {
      return;
    }

    const selectedLineData = lines.find((l) => l.id === selectedLine);
    const selectedStopData = stops.find((s) => s.id === selectedStop);

    if (!selectedLineData || !selectedStopData) {
      showToast({
        style: Toast.Style.Failure,
        title: "Invalid selection",
        message: "Please select both a line and a stop",
      });
      return;
    }

    const parsedWalkingTime = walkingTime ? parseInt(walkingTime, 10) : undefined;

    const config: StopConfig = {
      lineId: selectedLineData.id,
      lineName: selectedLineData.name,
      lineCode: selectedLineData.code,
      lineColor: selectedLineData.color,
      stopId: selectedStopData.id,
      stopName: selectedStopData.name,
      favoriteDirections: selectedDirections.length > 0 ? selectedDirections : undefined,
      walkingTimeMinutes: parsedWalkingTime && parsedWalkingTime > 0 ? parsedWalkingTime : undefined,
    };

    try {
      await LocalStorage.setItem(STOP_CONFIG_KEY, JSON.stringify(config));
      const directionInfo =
        config.favoriteDirections && config.favoriteDirections.length > 0
          ? ` → ${config.favoriteDirections.length} direction(s)`
          : "";
      showToast({
        style: Toast.Style.Success,
        title: "Configuration saved",
        message: `Line ${config.lineCode} - ${config.stopName}${directionInfo}`,
      });

      await launchCommand({ name: "check-next-metro", type: LaunchType.UserInitiated });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to save configuration",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return (
    <Form
      isLoading={isLoadingStops || isLoadingDirections}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Configuration" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Welcome to Next Metro" text="Select your metro line and stop to get started." />

      <Form.Dropdown
        id="line"
        title="Metro Line"
        placeholder="Select a metro line"
        value={selectedLine}
        onChange={(value) => {
          setSelectedLine(value);
          validateLine(value);
        }}
        error={lineError}
        onBlur={(event) => validateLine(event.target.value)}
      >
        <Form.Dropdown.Item key="placeholder" value="" title="Select a line..." />
        {lines.map((line) => (
          <Form.Dropdown.Item
            key={line.id}
            value={line.id}
            title={`Line ${line.code}`}
            icon={{ source: Icon.CircleFilled, tintColor: `#${line.color}` }}
          />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="stop"
        title="Stop"
        placeholder={selectedLine ? "Select a stop" : "Select a line first"}
        value={selectedStop}
        onChange={(value) => {
          setSelectedStop(value);
          validateStop(value);
        }}
        error={stopError}
        onBlur={(event) => validateStop(event.target.value)}
      >
        <Form.Dropdown.Item
          key="placeholder"
          value=""
          title={selectedLine ? "Select a stop..." : "Select a line first"}
        />
        {stops.map((stop) => (
          <Form.Dropdown.Item key={stop.id} value={stop.id} title={stop.name} icon={Icon.Pin} />
        ))}
      </Form.Dropdown>

      {selectedStop && directions.length > 0 && (
        <Form.TagPicker
          id="directions"
          title="Favorite Directions"
          info="Optional: Select one or more directions to prioritize (useful for branching lines like 7 or 13)"
          placeholder="All directions"
          value={selectedDirections}
          onChange={setSelectedDirections}
        >
          {directions.map((direction) => (
            <Form.TagPicker.Item key={direction} value={direction} title={direction} icon={Icon.ArrowRight} />
          ))}
        </Form.TagPicker>
      )}

      {selectedStop && (
        <Form.TextField
          id="walkingTime"
          title="Walking Time"
          placeholder="0"
          info="Optional: Minutes it takes you to walk to the stop. Departure times will be adjusted accordingly."
          value={walkingTime}
          onChange={(value) => {
            setWalkingTime(value);
            validateWalkingTime(value);
          }}
          error={walkingTimeError}
          onBlur={(event) => validateWalkingTime(event.target.value)}
        />
      )}
    </Form>
  );
}

export { STOP_CONFIG_KEY };
