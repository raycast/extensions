import { Form, ActionPanel, showToast, Toast, Clipboard, Action } from "@raycast/api";
import { useState, useEffect } from "react";

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h = 0,
    s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h /= 360;
  s /= 100;
  l /= 100;
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

export default function Command() {
  const [clipboardText, setClipboardText] = useState("");

  useEffect(() => {
    Clipboard.readText().then((text) => setClipboardText(text || ""));
  }, []);

  async function handleSubmit(values: { color: string; from: string; to: string }) {
    const input = values.color;
    const from = values.from;
    const to = values.to;
    if (!input) {
      await showToast(Toast.Style.Failure, "No input provided");
      return;
    }

    try {
      let rgb: { r: number; g: number; b: number };
      if (from === "hex") {
        rgb = hexToRgb(input);
      } else if (from === "rgb") {
        const match = input.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (!match) throw new Error("Invalid RGB format");
        rgb = { r: parseInt(match[1]), g: parseInt(match[2]), b: parseInt(match[3]) };
      } else if (from === "hsl") {
        const match = input.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
        if (!match) throw new Error("Invalid HSL format");
        rgb = hslToRgb(parseInt(match[1]), parseInt(match[2]), parseInt(match[3]));
      } else {
        throw new Error("Invalid from format");
      }

      let result: string;
      if (to === "hex") {
        result = rgbToHex(rgb.r, rgb.g, rgb.b);
      } else if (to === "rgb") {
        result = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
      } else if (to === "hsl") {
        const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
        result = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
      } else {
        throw new Error("Invalid to format");
      }

      await Clipboard.copy(result);
      await showToast(Toast.Style.Success, "Converted color copied to clipboard");
    } catch (error) {
      await showToast(Toast.Style.Failure, `Conversion failed: ${(error as Error).message}`);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Convert Color" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="color"
        title="Enter color"
        placeholder="#ff0000 or rgb(255,0,0) or hsl(0,100%,50%)"
        defaultValue={clipboardText}
      />
      <Form.Dropdown id="from" title="From Format">
        <Form.Dropdown.Item value="hex" title="Hex" />
        <Form.Dropdown.Item value="rgb" title="RGB" />
        <Form.Dropdown.Item value="hsl" title="HSL" />
      </Form.Dropdown>
      <Form.Dropdown id="to" title="To Format">
        <Form.Dropdown.Item value="hex" title="Hex" />
        <Form.Dropdown.Item value="rgb" title="RGB" />
        <Form.Dropdown.Item value="hsl" title="HSL" />
      </Form.Dropdown>
    </Form>
  );
}
