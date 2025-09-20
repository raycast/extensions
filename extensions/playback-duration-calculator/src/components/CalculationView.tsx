import { Form, getPreferenceValues } from "@raycast/api";
import { useState, useEffect } from "react";
import PlaybackSpeedDropdown from "./PlaybackSpeedDropdown";
import { calculate } from "../utils/calculations";
import { PlaybackSpeed, CalculationOutput } from "../utils/types";
import Actions from "./Actions";

export default function CalculationView() {
  const preferences = getPreferenceValues();
  const [hours, setHours] = useState<number>(0);
  const [minutes, setMinutes] = useState<number>(0);
  const [seconds, setSeconds] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(preferences.defaultPlaybackSpeed || "1");

  const [hoursError, setHoursError] = useState<string | undefined>();
  const [minutesError, setMinutesError] = useState<string | undefined>();
  const [secondsError, setSecondsError] = useState<string | undefined>();
  const [speedError, setSpeedError] = useState<string | undefined>();

  const [durationCalculation, setDurationCalculation] = useState<CalculationOutput>({
    playbackDuration: "00:00:00",
    timeSaved: "00:00:00",
    completionTime: "00:00",
  });

  const validationRegex = /[^0-9:]/;

  useEffect(() => {
    setDurationCalculation(calculate(hours, minutes, seconds, Number(playbackSpeed)));
  }, [hours, minutes, seconds, playbackSpeed]);

  return (
    <Form actions={<Actions {...durationCalculation} />}>
      <Form.Description text="Enter the total duration of your video or audio in hours, minutes and seconds." />
      <Form.TextField
        id="hours"
        title="Hours"
        placeholder="0"
        autoFocus
        error={hoursError}
        onChange={(value) => {
          const hoursValue = Number(value) || 0;
          if (validationRegex.test(value)) {
            setHoursError("Only numbers are allowed");
          } else if (hoursValue < 0) {
            setHoursError("Must be at least 0");
          } else {
            setHours(hoursValue);
            if (hoursError) {
              setHoursError(undefined);
            }
          }
        }}
      ></Form.TextField>
      <Form.TextField
        id="minutes"
        title="Minutes"
        placeholder="0"
        error={minutesError}
        onChange={(value) => {
          const minutesValue = Number(value) || 0;
          if (validationRegex.test(value)) {
            setMinutesError("Only numbers are allowed");
          } else if (minutesValue < 0) {
            setMinutesError("Must be at least 0");
          } else if (minutesValue >= 60) {
            setMinutesError("Must be less than 60");
          } else {
            setMinutes(minutesValue);
            if (minutesError) {
              setMinutesError(undefined);
            }
          }
        }}
      ></Form.TextField>
      <Form.TextField
        id="seconds"
        title="Seconds"
        placeholder="0"
        error={secondsError}
        onChange={(value) => {
          const secondsValue = Number(value) || 0;
          if (validationRegex.test(value)) {
            setSecondsError("Only numbers are allowed");
          } else if (secondsValue < 0) {
            setSecondsError("Must be at least 0");
          } else if (secondsValue >= 60) {
            setSecondsError("Must be less than 60");
          } else {
            setSeconds(secondsValue);
            if (secondsError) {
              setSecondsError(undefined);
            }
          }
        }}
      ></Form.TextField>
      <Form.Description text="Select the playback speed of the video or audio." />
      {preferences.useCustomPlaybackSpeed ? (
        <Form.TextField
          id="playbackSpeed"
          title="Speed Multiplier"
          placeholder="2"
          error={speedError}
          onChange={(value) => {
            const speedValue = Number(value) || 0;
            if (!/^\d*\.?\d*$/.test(value)) {
              setSpeedError("Only numbers are allowed");
            } else if (speedValue <= 0) {
              setSpeedError("Must be over 0");
            } else {
              setPlaybackSpeed(value);
              if (speedError) {
                setSpeedError(undefined);
              }
            }
          }}
        ></Form.TextField>
      ) : (
        <PlaybackSpeedDropdown value={playbackSpeed} onChange={setPlaybackSpeed}></PlaybackSpeedDropdown>
      )}
      <Form.Separator></Form.Separator>
      <Form.Description title="New Duration" text={durationCalculation.playbackDuration} />
      <Form.Description title="Time Saved" text={durationCalculation.timeSaved} />
      <Form.Description title="Completion Time" text={durationCalculation.completionTime} />
    </Form>
  );
}
