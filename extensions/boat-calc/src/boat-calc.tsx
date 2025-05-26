import { Form, ActionPanel, Action, showToast, Toast, Icon } from "@raycast/api";
import { useState } from "react";

interface BoatCalculation {
  distance?: number;
  time?: number;
  speed?: number;
}

function calculateMissingValue(input: BoatCalculation): BoatCalculation {
  const result = { ...input };

  if (result.distance && result.time && !result.speed) {
    // Speed = Distance / Time
    result.speed = result.distance / result.time;
  } else if (result.distance && result.speed && !result.time) {
    // Time = Distance / Speed
    result.time = result.distance / result.speed;
  } else if (result.time && result.speed && !result.distance) {
    // Distance = Speed * Time
    result.distance = result.time * result.speed;
  }

  return result;
}

function formatNumber(num: number | undefined): string {
  if (num === undefined) return "-";
  return num.toFixed(2);
}

function formatTime(hours: number | undefined): string {
  if (hours === undefined) return "-";

  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;

  return `${hours.toFixed(2)} timmar (${h} timmar ${m} minuter)`;
}

export default function Command() {
  const [distance, setDistance] = useState<string>("");
  const [time, setTime] = useState<string>("");
  const [speed, setSpeed] = useState<string>("");
  const [result, setResult] = useState<BoatCalculation>({});

  async function handleSubmit() {
    try {
      const input: BoatCalculation = {};

      if (distance) input.distance = parseFloat(distance);
      if (time) input.time = parseFloat(time);
      if (speed) input.speed = parseFloat(speed);

      // Count how many values are provided
      const providedValues = Object.values(input).filter((v) => v !== undefined).length;

      if (providedValues !== 2) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Ogiltig inmatning",
          message: "Vänligen ange exakt två värden för att beräkna det tredje",
        });
        return;
      }

      const calculatedResult = calculateMissingValue(input);
      setResult(calculatedResult);

      await showToast({
        style: Toast.Style.Success,
        title: "Beräkning klar",
        message: `Distans: ${formatNumber(calculatedResult.distance)}nm, Tid: ${formatTime(calculatedResult.time)}, Hastighet: ${formatNumber(calculatedResult.speed)}knop`,
      });
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Fel",
        message: "Vänligen ange giltiga siffror",
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Beräkna" onSubmit={handleSubmit} icon={Icon.Calculator} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Båtberäknare"
        text="Ange två värden för att beräkna det tredje. Alla värden ska anges i distans (distansminuter), tid (timmar) och hastighet (knop)."
      />
      <Form.TextField
        id="distance"
        title="Distans"
        placeholder="Ange distans i distansminuter"
        value={distance}
        onChange={setDistance}
        info="Resans längd"
      />
      <Form.TextField
        id="time"
        title="Tid"
        placeholder="Ange tid i timmar"
        value={time}
        onChange={setTime}
        info="Resans varaktighet"
      />
      <Form.TextField
        id="speed"
        title="Hastighet"
        placeholder="Ange hastighet i knop"
        value={speed}
        onChange={setSpeed}
        info="Båtens hastighet"
      />
      {result.distance !== undefined && result.time !== undefined && result.speed !== undefined && (
        <Form.Description
          title="Resultat"
          text={`Distans: ${formatNumber(result.distance)} distansminuter
Tid: ${formatTime(result.time)}
Hastighet: ${formatNumber(result.speed)} knop`}
        />
      )}
    </Form>
  );
}
