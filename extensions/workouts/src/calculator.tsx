import { Form, getPreferenceValues } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useState } from "react";
import { CalculationMode, distancePresets, PaceCalculatorForm, type DistancePreset } from "./constants";
import { parseFlexibleTime } from "./utils";

export default function Calculator() {
  const [time, setTime] = useState<string>("");
  const [pace, setPace] = useState<string>("");
  const [mode, setMode] = useCachedState<CalculationMode>("calculation_mode", "pace");
  const [distance, setDistance] = useState<string>("");
  const [selectedPreset, setSelectedPreset] = useState<string>("");

  const preferences: ExtensionPreferences = getPreferenceValues();

  const handleDistanceChange = (value: string) => {
    const isPreset = (p: string): p is DistancePreset => p in distancePresets;
    if (isPreset(value)) {
      setDistance(distancePresets[value][preferences.distance_unit]);
      setSelectedPreset(value);
    } else if (value === "") {
      setDistance("");
      setSelectedPreset("");
    } else {
      // Try to parse the value as a number
      const numValue = parseFloat(value.replace(",", "."));
      if (!isNaN(numValue)) {
        setDistance(value);
        setSelectedPreset("");
      }
    }
  };

  const calculatePace = (values: PaceCalculatorForm) => {
    const distance = parseFloat(values.distance.replace(",", ".")) || 0;
    if (distance === 0) return "00:00";

    // Parse time using flexible format
    const parsedTime = parseFlexibleTime(values.time);
    if (!parsedTime) return "00:00";

    // Parse time (HH:MM:SS format)
    const [hours, minutes, seconds] = parsedTime.split(":").map(Number);
    const totalMinutes = hours * 60 + (minutes || 0) + (seconds || 0) / 60;

    // Calculate pace (minutes per unit)
    const paceMinutes = totalMinutes / distance;

    // Convert to HH:MM:SS format
    const paceHours = Math.floor(paceMinutes / 60);
    const paceRemainingMinutes = Math.floor(paceMinutes % 60);
    const paceSeconds = Math.floor((paceMinutes * 60) % 60);

    return `${String(paceHours).padStart(2, "0")}:${String(paceRemainingMinutes).padStart(2, "0")}:${String(paceSeconds).padStart(2, "0")}`;
  };

  const calculateTime = (values: PaceCalculatorForm) => {
    const distance = parseFloat(values.distance.replace(",", ".")) || 0;
    if (distance === 0) return "00:00:00";

    // Parse pace using flexible format
    let paceInMinutes = 0;
    const paceValue = values.pace.toLowerCase().trim();

    // Try MM:SS format first
    const mmssMatch = paceValue.match(/^(\d{1,2}):(\d{1,2})$/);
    if (mmssMatch) {
      const [, minutes, seconds] = mmssMatch;
      paceInMinutes = parseInt(minutes, 10) + parseInt(seconds, 10) / 60;
    } else {
      // Try other formats like "5min" or just "5"
      const minMatch = paceValue.match(/^(\d+(?:\.\d+)?)\s*(?:min(?:utes?)?)?$/);
      if (minMatch) {
        paceInMinutes = parseFloat(minMatch[1]);
      } else {
        return "00:00:00";
      }
    }

    // Calculate total time
    const totalMinutes = distance * paceInMinutes;

    // Convert to HH:MM:SS format
    const resultHours = Math.floor(totalMinutes / 60);
    const resultMinutes = Math.floor(totalMinutes % 60);
    const resultSeconds = Math.floor((totalMinutes * 60) % 60);

    return `${String(resultHours).padStart(2, "0")}:${String(resultMinutes).padStart(2, "0")}:${String(resultSeconds).padStart(2, "0")}`;
  };

  // Calculate values during render
  const values = {
    distance,
    time,
    pace,
    distanceUnit: preferences.distance_unit,
    mode,
  };

  const calculatedPace = mode === "pace" && distance && time ? calculatePace(values) : "00:00:00";
  const calculatedTime = mode === "time" && distance && pace ? calculateTime(values) : "00:00:00";

  // console.log({ values, calculatedPace, calculatedTime });
  return (
    <Form>
      <Form.Dropdown
        id="mode"
        title="Calculate"
        value={mode}
        onChange={(newValue) => setMode(newValue as CalculationMode)}
      >
        <Form.Dropdown.Item value="pace" title="Pace" />
        <Form.Dropdown.Item value="time" title="Time from Pace" />
      </Form.Dropdown>

      <Form.Dropdown
        id="distance"
        title="Distance"
        placeholder={`Enter or select distance in ${preferences.distance_unit}`}
        value={selectedPreset || distance}
        onChange={handleDistanceChange}
        onSearchTextChange={handleDistanceChange}
        storeValue
      >
        <Form.Dropdown.Section title="Custom">
          {!distance && <Form.Dropdown.Item value={distance} title="Enter distance" />}
          {distance && !selectedPreset && (
            <Form.Dropdown.Item value={distance} title={`${distance} ${preferences.distance_unit}`} />
          )}
        </Form.Dropdown.Section>
        <Form.Dropdown.Section title="Presets">
          {Object.entries(distancePresets).map(([presetName, presetValues]) => (
            <Form.Dropdown.Item
              key={presetName}
              value={presetName}
              title={`${presetName} (${presetValues[preferences.distance_unit]} ${preferences.distance_unit})`}
            />
          ))}
        </Form.Dropdown.Section>
      </Form.Dropdown>

      {mode === "pace" ? (
        <Form.TextField id="time" title="Time" placeholder="HH:MM:SS, 25min, 5h4m23s" value={time} onChange={setTime} />
      ) : (
        <Form.TextField id="pace" title="Target Pace" placeholder="MM:SS, 5min, or 5" value={pace} onChange={setPace} />
      )}

      {mode === "pace" ? (
        <Form.Description title="Calculated Pace" text={`${calculatedPace}/${preferences.distance_unit}`} />
      ) : (
        <Form.Description title="Required Time" text={calculatedTime} />
      )}
    </Form>
  );
}
