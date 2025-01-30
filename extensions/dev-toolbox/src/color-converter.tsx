import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import convert from "color-convert";

export default function ColorConverter() {
  const [hex, setHex] = useState("");
  const [rgb, setRgb] = useState("");
  const [hsl, setHsl] = useState("");

  const updateValues = (type: string, value: string) => {
    try {
      switch (type) {
        case "hex": {
          const cleanValue = value.replace(/^#/, "");
          if (/^([a-fA-F0-9]{0,6})$/.test(cleanValue)) {
            setHex(`#${cleanValue}`);

            if (cleanValue.length === 3 || cleanValue.length === 6) {
              const rgbArray = convert.hex.rgb(cleanValue);
              setRgb(rgbArray.join(", "));

              const hslArray = convert.hex.hsl(cleanValue);
              setHsl(`${hslArray[0]}°, ${hslArray[1]}%, ${hslArray[2]}%`);
            } else {
              setRgb("");
              setHsl("");
            }
          }
          break;
        }

        case "rgb": {
          setRgb(value);
          const rgbArray = value
            .split(/[,\s]+/)
            .map((n) => parseInt(n.trim()))
            .filter((n) => !isNaN(n));
          if (rgbArray.length === 3 && rgbArray.every((n) => n >= 0 && n <= 255)) {
            const hexValue = convert.rgb.hex(rgbArray as [number, number, number]);
            setHex(`#${hexValue}`);

            const hslArray = convert.rgb.hsl(rgbArray as [number, number, number]);
            setHsl(`${hslArray[0]}°, ${hslArray[1]}%, ${hslArray[2]}%`);
          } else {
            setHex("");
            setHsl("");
          }
          break;
        }

        case "hsl": {
          setHsl(value);
          const hslArray = value
            .replace(/[°%]/g, "")
            .split(/[,\s]+/)
            .map((n) => parseFloat(n.trim()))
            .filter((n) => !isNaN(n));
          if (
            hslArray.length === 3 &&
            hslArray[0] >= 0 &&
            hslArray[0] <= 360 &&
            hslArray[1] >= 0 &&
            hslArray[1] <= 100 &&
            hslArray[2] >= 0 &&
            hslArray[2] <= 100
          ) {
            const rgbArray = convert.hsl.rgb(hslArray as [number, number, number]);
            setRgb(rgbArray.join(", "));

            const hexValue = convert.rgb.hex(rgbArray as [number, number, number]);
            setHex(`#${hexValue}`);
          } else {
            setHex("");
            setRgb("");
          }
          break;
        }
      }
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Invalid color value",
        message: "Please enter a valid color format",
      });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Hex to Clipboard"
            content={hex}
            shortcut={{ modifiers: ["cmd"], key: "1" }}
          />
          <Action.CopyToClipboard
            title="Copy Rgb to Clipboard"
            content={rgb}
            shortcut={{ modifiers: ["cmd"], key: "2" }}
          />
          <Action.CopyToClipboard
            title="Copy Hsl to Clipboard"
            content={hsl}
            shortcut={{ modifiers: ["cmd"], key: "3" }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="hex"
        title="HEX"
        placeholder="#RRGGBB"
        value={hex}
        onChange={(val) => updateValues("hex", val)}
      />
      <Form.TextField
        id="rgb"
        title="RGB"
        placeholder="R, G, B"
        value={rgb}
        onChange={(val) => updateValues("rgb", val)}
      />
      <Form.TextField
        id="hsl"
        title="HSL"
        placeholder="H°, S%, L%"
        value={hsl}
        onChange={(val) => updateValues("hsl", val)}
      />
    </Form>
  );
}
