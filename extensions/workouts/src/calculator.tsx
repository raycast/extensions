import { Form } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useState } from "react";
import { CalculationMode, distancePresets, PaceCalculatorForm, type DistancePreset } from "./constants";

export default function Calculator() {
  const [distance, setDistance] = useState<string>("");
  const [time, setTime] = useState<string>("");
  const [pace, setPace] = useState<string>("");
  const [mode, setMode] = useState<CalculationMode>("pace");
  const [unit, setUnit] = useCachedState<"km" | "mi">("unit", "km");
  const [selectedPreset, setSelectedPreset] = useState<string>("");

  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset);
    const isPreset = (p: string): p is DistancePreset => p in distancePresets;

    if (isPreset(preset)) {
      setDistance(distancePresets[preset][unit]);
    } else {
      setDistance("");
    }
  };

  const calculatePace = (values: PaceCalculatorForm) => {
    const distance = parseFloat(values.distance.replace(",", ".")) || 0;
    if (distance === 0) return "00:00";

    // Parse time (HH:MM:SS format)
    const [hours, minutes, seconds] = values.time.split(":").map(Number);
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

    // Parse pace (MM:SS format)
    const [paceMinutes, paceSeconds] = values.pace.split(":").map(Number);
    const paceInMinutes = (paceMinutes || 0) + (paceSeconds || 0) / 60;

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
    distanceUnit: unit,
    mode,
  };

  const calculatedPace = mode === "pace" && distance && time ? calculatePace(values) : "00:00:00";
  const calculatedTime = mode === "time" && distance && pace ? calculateTime(values) : "00:00:00";

  return (
    <Form>
      <Form.Dropdown
        id="mode"
        title="Calculation Mode"
        value={mode}
        onChange={(newValue) => setMode(newValue as CalculationMode)}
      >
        <Form.Dropdown.Item value="pace" title="Calculate Pace" />
        <Form.Dropdown.Item value="time" title="Calculate Time from Pace" />
      </Form.Dropdown>

      <Form.Dropdown
        id="preset"
        title="Preset Distances"
        placeholder="Select a preset distance"
        value={selectedPreset}
        onChange={handlePresetChange}
      >
        <Form.Dropdown.Item value="" title="Custom" />
        <Form.Dropdown.Item value="Marathon" title="Marathon" />
        <Form.Dropdown.Item value="Half-Marathon" title="Half-Marathon" />
        <Form.Dropdown.Item value="10K" title="10K" />
        <Form.Dropdown.Item value="5K" title="5K" />
      </Form.Dropdown>

      <Form.TextField
        id="distance"
        title="Distance"
        placeholder="Enter distance"
        value={distance}
        onChange={(newDistance) => {
          setDistance(newDistance);
          setSelectedPreset("");
        }}
      />
      {mode === "pace" ? (
        <Form.TextField id="time" title="Time" placeholder="HH:MM:SS" value={time} onChange={setTime} />
      ) : (
        <Form.TextField id="pace" title="Target Pace" placeholder="MM:SS" value={pace} onChange={setPace} />
      )}
      <Form.Dropdown
        id="distanceUnit"
        title="Unit"
        value={unit}
        onChange={(newValue) => {
          const newUnit = newValue as "km" | "mi";
          setUnit(newUnit);
          if (selectedPreset in distancePresets) {
            const value = distancePresets[selectedPreset as DistancePreset][newUnit];
            setDistance(value);
          }
        }}
      >
        <Form.Dropdown.Item value="km" title="Kilometers" />
        <Form.Dropdown.Item value="mi" title="Miles" />
      </Form.Dropdown>
      {mode === "pace" ? (
        <Form.Description title="Calculated Pace" text={`${calculatedPace}/${unit}`} />
      ) : (
        <Form.Description title="Required Time" text={calculatedTime} />
      )}
    </Form>
  );
}
