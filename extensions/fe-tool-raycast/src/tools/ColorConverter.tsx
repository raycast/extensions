import { ActionPanel, Form, Action, showToast, Toast } from "@raycast/api";
import { useState } from "react";

export default function Command() {
  const [color, setColor] = useState("");
  const [action, setAction] = useState<"hexToRgb" | "rgbToHex">("hexToRgb");
  const [result, setResult] = useState("");

  const handleSubmit = () => {
    try {
      if (action === "hexToRgb") {
        const rgb = hexToRgb(color);
        setResult(rgb ? `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` : "Invalid HEX color");
      } else {
        const hex = rgbToHex(color);
        setResult(hex || "Invalid RGB color");
      }
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Invalid color format",
      });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="action"
        title="Action"
        value={action}
        onChange={(newValue) => setAction(newValue as "hexToRgb" | "rgbToHex")}
      >
        <Form.Dropdown.Item title="HEX to RGB" value="hexToRgb" />
        <Form.Dropdown.Item title="RGB to HEX" value="rgbToHex" />
      </Form.Dropdown>
      <Form.TextField
        id="color"
        title="Color"
        placeholder={
          action === "hexToRgb" ? "Enter HEX color (e.g., #ff5733)" : "Enter RGB color (e.g., rgb(255, 87, 51))"
        }
        value={color}
        onChange={setColor}
      />
      {result.length > 0 && <Form.TextField id="result" title="Result" value={result} onChange={setResult} />}
    </Form>
  );
}

function hexToRgb(hex: string) {
  if (!/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex)) return null;

  hex = hex.replace("#", "");
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }

  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  return { r, g, b };
}

function rgbToHex(rgb: string) {
  const match = rgb.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/);
  if (!match) return null;

  const r = parseInt(match[1], 10);
  const g = parseInt(match[2], 10);
  const b = parseInt(match[3], 10);

  if (r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) return null;

  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}
