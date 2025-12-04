import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useState } from "react";
import { findClosestColor } from "./colors";

import {
  REMtoPX,
  REMtoPT,
  PXtoREM,
  PXtoPT,
  PTtoREM,
  PTtoPX,
  HEXtoRGBA,
  HEXtoRGB,
  HEXtoHSLA,
  HEXtoHSL,
  RGBtoHEX,
  RGBtoHEXA,
  RGBtoHSL,
  RGBtoHSLA,
  HSLtoHEX,
  HSLtoHEXA,
  HSLtoRGB,
  HSLtoRGBA,
} from "./conversions";
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
    setClosestColor(null);
    setTailwind(null);
    if (value === "") return;
    setInput(value);
    // check what input is

    // check if input is rem
    const remMatch = value.match(/(\d+|^.\d+|^,\d+|^\d+,\d+|^\d+.\d+)(\srem|rem)/i);
    if (remMatch) {
      console.log("its a rem");
      setPX(REMtoPX(Number(remMatch[1])));
      setPT(REMtoPT(Number(remMatch[1])));
      setTailwind(REMtoTailwindSpacing(Number(remMatch[1])));
    }

    // check if input is px
    const pxMatch = value.match(/(\d+|^.\d+|^,\d+|^\d+,\d+|^\d+.\d+)(\spx|px)/);
    if (pxMatch) {
      console.log("its a px");
      setREM(PXtoREM(Number(pxMatch[1])));
      setPT(PXtoPT(Number(pxMatch[1])));
      setTailwind(PXtoTailwindSpacing(Number(pxMatch[1])));
    }

    // check if input is pt
    const ptMatch = value.match(/(\d+|^.\d+|^,\d+|^\d+,\d+|^\d+.\d+)(\spt|pt)/i);
    if (ptMatch) {
      console.log("its a pt");
      setREM(PTtoREM(Number(ptMatch[1])));
      setPX(PTtoPX(Number(ptMatch[1])));
    }

    // check if input is hex color
    const hexMatch = value.match(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})(?<alpha>[A-Fa-f0-9]{2})?$/i);
    if (hexMatch) {
      console.log("its a hex");
      // if hex color has alpha
      if (hexMatch.groups && hexMatch.groups.alpha) {
        setRGBA(HEXtoRGBA(value));
        setRGB(HEXtoRGB(hexMatch[1]));
        setHSLA(HEXtoHSLA(value));
        setHSL(HEXtoHSL(hexMatch[1]));
      } else {
        const hexToRgbResult = HEXtoRGB(value);
        setRGB(hexToRgbResult);
        setHSL(HEXtoHSL(value));
        setClosestColor(findClosestColor(hexToRgbResult[0], hexToRgbResult[1], hexToRgbResult[2]));
      }
    }

    // check if input is rgb color
    const rgbMatch = value.match(
      /^rgb(a)?\((\d{1,3}),(\s)?(\d{1,3}),(\s)?(\d{1,3})(,(\s)?(?<alpha>\d+\.\d+|\.\d+))?\)$/i,
    );
    if (rgbMatch) {
      console.log("its a rgb");
      // if rgb color has alpha
      if (rgbMatch.groups && rgbMatch.groups.alpha) {
        setHEX(RGBtoHEX([+rgbMatch[2], +rgbMatch[4], +rgbMatch[6]]));
        setHEXA(RGBtoHEXA([+rgbMatch[2], +rgbMatch[4], +rgbMatch[6], +rgbMatch.groups.alpha]));
        setHSL(RGBtoHSL([+rgbMatch[2], +rgbMatch[4], +rgbMatch[6]]));
        setHSLA(RGBtoHSLA([+rgbMatch[2], +rgbMatch[4], +rgbMatch[6], +rgbMatch.groups.alpha]));
      } else {
        setHEX(RGBtoHEX([+rgbMatch[2], +rgbMatch[4], +rgbMatch[6]]));
        setHSL(RGBtoHSL([+rgbMatch[2], +rgbMatch[4], +rgbMatch[6]]));
        setClosestColor(findClosestColor(+rgbMatch[2], +rgbMatch[4], +rgbMatch[6]));
      }
    }

    // check if input is hsl color
    const hslMatch = value.match(
      /^hsl(a)?\((\d{1,3}),(\s)?(\d{1,3})(%)?,(\s)?(\d{1,3})(%)?(,(\s)?(?<alpha>\d+\.\d+|\.\d+))?\)$/i,
    );
    if (hslMatch) {
      console.log("its a hsl");
      // if hsl color has alpha
      if (hslMatch.groups && hslMatch.groups.alpha) {
        setHEX(HSLtoHEX([+hslMatch[2], +hslMatch[4], +hslMatch[7]]));
        setHEXA(HSLtoHEXA([+hslMatch[2], +hslMatch[4], +hslMatch[7], +hslMatch.groups.alpha]));
        setRGB(HSLtoRGB([+hslMatch[2], +hslMatch[4], +hslMatch[7]]));
        setRGBA(HSLtoRGBA([+hslMatch[2], +hslMatch[4], +hslMatch[7], +hslMatch.groups.alpha]));
      } else {
        const hslToRgbResult = HSLtoRGB([+hslMatch[2], +hslMatch[4], +hslMatch[7]]);
        setHEX(HSLtoHEX([+hslMatch[2], +hslMatch[4], +hslMatch[7]]));
        setRGB(hslToRgbResult);
        setClosestColor(findClosestColor(hslToRgbResult[0], hslToRgbResult[1], hslToRgbResult[2]));
      }
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
