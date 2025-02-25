import { Form } from "@raycast/api";
import { useState, useEffect } from "react";

const COLOR_BANDS = [
  { value: "black", label: "Black", digit: 0, multiplier: 1 },
  { value: "brown", label: "Brown", digit: 1, multiplier: 10 },
  { value: "red", label: "Red", digit: 2, multiplier: 100 },
  { value: "orange", label: "Orange", digit: 3, multiplier: 1000 },
  { value: "yellow", label: "Yellow", digit: 4, multiplier: 10000 },
  { value: "green", label: "Green", digit: 5, multiplier: 100000 },
  { value: "blue", label: "Blue", digit: 6, multiplier: 1000000 },
  { value: "violet", label: "Violet", digit: 7, multiplier: 10000000 },
  { value: "gray", label: "Gray", digit: 8, multiplier: 100000000 },
  { value: "white", label: "White", digit: 9, multiplier: 1000000000 },
  { value: "gold", label: "Gold", multiplier: 0.1, tolerance: 5 },
  { value: "silver", label: "Silver", multiplier: 0.01, tolerance: 10 },
];

const BAND_EMOJIS: { [key: string]: string } = {
  black: "⬛",
  brown: "🟫",
  red: "🟥",
  orange: "🟧",
  yellow: "🟨",
  green: "🟩",
  blue: "🟦",
  violet: "🟪",
  gray: "⬜",
  white: "⬜",
  gold: "🟡",
  silver: "⚪",
};

export default function ComponentHelper() {
  const [bands, setBands] = useState<string[]>([]);
  const [result, setResult] = useState("");

  useEffect(() => {
    try {
      if (bands.length < 4 || bands.length > 5) {
        throw new Error("Select 4 or 5 bands");
      }

      const digits = bands.slice(0, bands.length - 2);
      const multiplierBand = bands[bands.length - 2];
      const toleranceBand = bands[bands.length - 1];

      const digitValues = digits.map((b) => COLOR_BANDS.find((c) => c.value === b)?.digit ?? 0);
      const multiplier = COLOR_BANDS.find((c) => c.value === multiplierBand)?.multiplier ?? 1;
      const tolerance = COLOR_BANDS.find((c) => c.value === toleranceBand)?.tolerance ?? 20;

      const resistance = parseInt(digitValues.join("")) * multiplier;
      setResult(`${resistance} Ω ±${tolerance}%`);
    } catch (error) {
      setResult("");
    }
  }, [bands]);

  return (
    <Form>
      <Form.TagPicker id="bands" title="Select Color Bands" value={bands} onChange={setBands}>
        {COLOR_BANDS.map((color) => (
          <Form.TagPicker.Item key={color.value} value={color.value} title={color.label} />
        ))}
      </Form.TagPicker>

      {bands.length > 0 && (
        <Form.Description title="Band Visualization" text={bands.map((band) => BAND_EMOJIS[band] || "❓").join(" ")} />
      )}

      {result && <Form.Description title="Resistance Value" text={result} />}
    </Form>
  );
}
