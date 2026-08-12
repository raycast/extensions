import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useState } from "react";
import { findClosestColor } from "./colors";

import { REMtoPX, REMtoPT, PXtoREM, PXtoPT, PTtoREM, PTtoPX } from "./spacingsConversion";
import {
  HEXtoRGBA,
  HEXtoRGB,
  HEXtoHSLA,
  HEXtoHSL,
  HEXtoOKLCH,
  RGBtoHEX,
  RGBtoHEXA,
  RGBtoHSL,
  RGBtoHSLA,
  RGBtoOKLCH,
  HSLtoHEX,
  HSLtoHEXA,
  HSLtoRGB,
  HSLtoRGBA,
  OKLCHtoRGB,
  OKLCHtoHEX,
  OKLCHtoHSL,
} from "./colorsConversion";
import { checkHslMatch, checkRgbMatch, parseAlpha, parseRgbChannel } from "./matching";
import { PXtoTailwindSpacing, REMtoTailwindSpacing } from "./spacings";

function disableAdjustContrast(rawColor: string): Color.Dynamic {
  return { light: rawColor, dark: rawColor, adjustContrast: false };
}

export default function Command() {
  const [rem, setREM] = useState<number | null>(null);
  const [px, setPX] = useState<number | null>(null);
  const [pt, setPT] = useState<number | null>(null);
  const [hex, setHEX] = useState<string | null>(null);
  const [hexa, setHEXA] = useState<string | null>(null);
  const [rgb, setRGB] = useState<number[] | null>(null);
  const [rgba, setRGBA] = useState<number[] | null>(null);
  const [hsl, setHSL] = useState<number[] | null>(null);
  const [hsla, setHSLA] = useState<number[] | null>(null);
  const [oklch, setOKLCH] = useState<number[] | null>(null);
  const [tailwind, setTailwind] = useState<string | null>(null);
  const [closestColor, setClosestColor] = useState<{ name: string; hex: string } | null>(null);
  const [input, setInput] = useState("");

  const handleOnTextChange = (value = "") => {
    setPX(null);
    setREM(null);
    setPT(null);
    setHEX(null);
    setHEXA(null);
    setRGB(null);
    setRGBA(null);
    setHSL(null);
    setHSLA(null);
    setOKLCH(null);
    setClosestColor(null);
    setTailwind(null);
    if (value === "") return;
    setInput(value);
    // check what input is

    // check if input is rem
    const remMatch = value.match(/(\d+|^.\d+|^,\d+|^\d+,\d+|^\d+.\d+)(\srem|rem)/i);
    if (remMatch) {
      setPX(REMtoPX(Number(remMatch[1])));
      setPT(REMtoPT(Number(remMatch[1])));
      setTailwind(REMtoTailwindSpacing(Number(remMatch[1])));
    }

    // check if input is px
    const pxMatch = value.match(/(\d+|^.\d+|^,\d+|^\d+,\d+|^\d+.\d+)(\spx|px)/);
    if (pxMatch) {
      setREM(PXtoREM(Number(pxMatch[1])));
      setPT(PXtoPT(Number(pxMatch[1])));
      setTailwind(PXtoTailwindSpacing(Number(pxMatch[1])));
    }

    // check if input is pt
    const ptMatch = value.match(/(\d+|^.\d+|^,\d+|^\d+,\d+|^\d+.\d+)(\spt|pt)/i);
    if (ptMatch) {
      setREM(PTtoREM(Number(ptMatch[1])));
      setPX(PTtoPX(Number(ptMatch[1])));
    }

    // check if input is hex color
    const hexMatch = value.match(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})(?<alpha>[A-Fa-f0-9]{2})?$/i);
    if (hexMatch) {
      const hexWithoutAlpha = `#${hexMatch[1]}`;
      const hexToRgbResult = HEXtoRGB(hexWithoutAlpha);

      if (hexMatch.groups?.alpha) {
        setHEX(RGBtoHEX(hexToRgbResult));
        setHEXA(value);
        setRGBA(HEXtoRGBA(value));
        setRGB(hexToRgbResult);
        setHSLA(HEXtoHSLA(value));
        setHSL(HEXtoHSL(hexWithoutAlpha));
        setOKLCH(RGBtoOKLCH(hexToRgbResult));
        setClosestColor(findClosestColor(hexToRgbResult[0], hexToRgbResult[1], hexToRgbResult[2]));
      } else {
        setRGB(hexToRgbResult);
        setHSL(HEXtoHSL(value));
        setOKLCH(HEXtoOKLCH(value));
        setClosestColor(findClosestColor(hexToRgbResult[0], hexToRgbResult[1], hexToRgbResult[2]));
      }
    }

    // check if input is rgb color (comma- or space-separated)
    const rgbMatchGroups = checkRgbMatch(value);
    if (rgbMatchGroups) {
      const { r, g, b, alpha } = rgbMatchGroups;
      const rgbResult = [parseRgbChannel(r), parseRgbChannel(g), parseRgbChannel(b)];

      if (alpha) {
        const rgbaResult = [...rgbResult, parseAlpha(alpha)];
        setHEX(RGBtoHEX(rgbResult));
        setHEXA(RGBtoHEXA(rgbaResult));
        setRGB(rgbResult);
        setRGBA(rgbaResult);
        setHSL(RGBtoHSL([...rgbResult]));
        setHSLA(RGBtoHSLA(rgbaResult));
        setOKLCH(RGBtoOKLCH(rgbResult));
        setClosestColor(findClosestColor(rgbResult[0], rgbResult[1], rgbResult[2]));
      } else {
        setHEX(RGBtoHEX(rgbResult));
        setRGB(rgbResult);
        setHSL(RGBtoHSL([...rgbResult]));
        setOKLCH(RGBtoOKLCH(rgbResult));
        setClosestColor(findClosestColor(rgbResult[0], rgbResult[1], rgbResult[2]));
      }
    }

    // check if input is hsl color (comma-separated or space-separated)
    const hslMatchGroups = checkHslMatch(value);
    if (hslMatchGroups) {
      const { h, s, l, alpha } = hslMatchGroups;
      const hslValues = [+h, +s, +l];

      if (alpha) {
        const hslToRgbResult = HSLtoRGB(hslValues);
        const alphaValue = parseAlpha(alpha);
        setHEX(HSLtoHEX(hslValues));
        setHEXA(HSLtoHEXA([+h, +s, +l, alpha]));
        setRGB(hslToRgbResult);
        setRGBA(HSLtoRGBA([+h, +s, +l, alpha]));
        setHSL(hslValues);
        setHSLA([+h, +s, +l, alphaValue]);
        setOKLCH(RGBtoOKLCH(hslToRgbResult));
        setClosestColor(findClosestColor(hslToRgbResult[0], hslToRgbResult[1], hslToRgbResult[2]));
      } else {
        const hslToRgbResult = HSLtoRGB(hslValues);
        setHEX(HSLtoHEX(hslValues));
        setHSL(hslValues);
        setRGB(hslToRgbResult);
        setOKLCH(RGBtoOKLCH(hslToRgbResult));
        setClosestColor(findClosestColor(hslToRgbResult[0], hslToRgbResult[1], hslToRgbResult[2]));
      }
    }

    // check if input is oklch color
    const oklchMatch = value.match(/^oklch\(\s*([\d.]+)(%)?\s+([\d.]+)\s+([\d.]+)\s*\)$/i);
    if (oklchMatch) {
      let l = parseFloat(oklchMatch[1]);
      if (oklchMatch[2] === "%") {
        l = l / 100;
      }
      const c = parseFloat(oklchMatch[3]);
      const h = parseFloat(oklchMatch[4]);

      const oklchValues = [l, c, h];
      const oklchToRgbResult = OKLCHtoRGB(oklchValues);
      setOKLCH(oklchValues);
      setHEX(OKLCHtoHEX(oklchValues));
      setRGB(oklchToRgbResult);
      setHSL(OKLCHtoHSL(oklchValues));
      setClosestColor(findClosestColor(oklchToRgbResult[0], oklchToRgbResult[1], oklchToRgbResult[2]));
    }
  };

  return (
    <List
      onSearchTextChange={handleOnTextChange}
      enableFiltering={false}
      searchBarPlaceholder="Type your unit here... (eg.: 22px or #006699)"
    >
      <List.Section>
        {rem && (
          <List.Item
            title={`${rem}rem`}
            accessories={[{ text: "to rem" }]}
            actions={
              <ActionPanel title="Copy">
                <Action.CopyToClipboard content={`${rem}rem`} />
              </ActionPanel>
            }
          />
        )}
        {px && (
          <List.Item
            title={`${px}px`}
            accessories={[{ text: "to px" }]}
            actions={
              <ActionPanel title="Copy">
                <Action.CopyToClipboard content={`${px}px`} />
              </ActionPanel>
            }
          />
        )}
        {pt && (
          <List.Item
            title={`${pt}pt`}
            accessories={[{ text: "to pt" }]}
            actions={
              <ActionPanel title="Copy">
                <Action.CopyToClipboard content={`${pt}pt`} />
              </ActionPanel>
            }
          />
        )}
        {hex && (
          <List.Item
            title={hex}
            icon={{ source: Icon.CircleFilled, tintColor: disableAdjustContrast(hex) }}
            accessories={[{ text: "to hex" }]}
            actions={
              <ActionPanel title="Copy">
                <Action.CopyToClipboard content={hex} />
              </ActionPanel>
            }
          />
        )}
        {hexa && (
          <List.Item
            title={hexa}
            icon={{ source: Icon.CircleFilled, tintColor: disableAdjustContrast(hexa) }}
            accessories={[{ text: "to hexa" }]}
            actions={
              <ActionPanel title="Copy">
                <Action.CopyToClipboard content={hexa} />
              </ActionPanel>
            }
          />
        )}
        {rgb && (
          <List.Item
            title={`rgb(${rgb.join(", ")})`}
            icon={{ source: Icon.CircleFilled, tintColor: disableAdjustContrast(`rgb(${rgb.join(", ")})`) }}
            accessories={[{ text: "to rgb" }]}
            actions={
              <ActionPanel title="Copy">
                <Action.CopyToClipboard content={`rgb(${rgb.join(", ")})`} />
              </ActionPanel>
            }
          />
        )}
        {rgba && (
          <List.Item
            title={`rgba(${rgba.join(", ")})`}
            icon={{ source: Icon.CircleFilled, tintColor: disableAdjustContrast(`rgba(${rgba.join(", ")})`) }}
            accessories={[{ text: "to rgba" }]}
            actions={
              <ActionPanel title="Copy">
                <Action.CopyToClipboard content={`rgba(${rgba.join(", ")})`} />
              </ActionPanel>
            }
          />
        )}
        {hsl && (
          <List.Item
            title={`hsl(${hsl[0]}, ${hsl[1]}%, ${hsl[2]}%)`}
            icon={{
              source: Icon.CircleFilled,
              tintColor: disableAdjustContrast(`hsl(${hsl[0]}, ${hsl[1]}%, ${hsl[2]}%)`),
            }}
            accessories={[{ text: "to hsl" }]}
            actions={
              <ActionPanel title="Copy">
                <Action.CopyToClipboard content={`hsl(${hsl[0]}, ${hsl[1]}%, ${hsl[2]}%)`} />
              </ActionPanel>
            }
          />
        )}
        {hsla && (
          <List.Item
            title={`hsla(${hsla[0]}, ${hsla[1]}%, ${hsla[2]}%, ${hsla[3]})`}
            icon={{
              source: Icon.CircleFilled,
              tintColor: disableAdjustContrast(`hsla(${hsla[0]}, ${hsla[1]}%, ${hsla[2]}%, ${hsla[3]})`),
            }}
            accessories={[{ text: "to hsla" }]}
            actions={
              <ActionPanel title="Copy">
                <Action.CopyToClipboard content={`hsla(${hsla[0]}, ${hsla[1]}%, ${hsla[2]}%, ${hsla[3]})`} />
              </ActionPanel>
            }
          />
        )}
        {oklch && (
          <List.Item
            title={`oklch(${oklch[0]} ${oklch[1]} ${oklch[2]})`}
            icon={{
              source: Icon.CircleFilled,
              tintColor: disableAdjustContrast(`hsl(${hsl?.[0] ?? 0}, ${hsl?.[1] ?? 0}%, ${hsl?.[2] ?? 0}%)`),
            }}
            accessories={[{ text: "to oklch" }]}
            actions={
              <ActionPanel title="Copy">
                <Action.CopyToClipboard content={`oklch(${oklch[0]} ${oklch[1]} ${oklch[2]})`} />
              </ActionPanel>
            }
          />
        )}
        {closestColor && (
          <List.Item
            title={input !== closestColor.hex && hex !== closestColor.hex ? closestColor.hex : closestColor.name}
            subtitle={input !== closestColor.hex && hex !== closestColor.hex ? closestColor.name : ""}
            icon={{ source: Icon.CircleFilled, tintColor: disableAdjustContrast(closestColor.hex) }}
            accessories={[
              {
                text:
                  input !== closestColor.hex && hex !== closestColor.hex ? "closest Tailwind color" : "Tailwind color",
              },
            ]}
            actions={
              <ActionPanel title="Copy">
                <Action.CopyToClipboard content={input !== closestColor.hex ? closestColor.hex : closestColor.name} />
              </ActionPanel>
            }
          />
        )}
        {tailwind && (
          <List.Item
            title={tailwind}
            accessories={[{ text: tailwind.includes("]") ? "to Tailwind Arbitrary Value" : "to Tailwind Spacing" }]}
            actions={
              <ActionPanel title="Copy">
                <Action.CopyToClipboard content={tailwind} />
              </ActionPanel>
            }
          />
        )}
      </List.Section>
    </List>
  );
}
