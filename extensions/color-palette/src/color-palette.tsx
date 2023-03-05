import { Action, ActionPanel, Grid, Cache, Icon } from "@raycast/api";
import { useState, useEffect, useRef } from "react";
import { generatePalettes } from "./ColorSchemeVariants";
import ChineseTraditionalColor from "../assets/Palette_ChineseTraditionalColor.json";
import OpenColor from "../assets/Plaette_OpenColor.json";
import AntDesign from "../assets/Palette_AntDesign.json";
import ArcoDesign from "../assets/Palette_ArcoDesign.json";
import SemiDesign from "../assets/Palette_SemiDesign.json";
import Tdesign from "../assets/Palette_TDesign.json";
import Spectrum from "../assets/Palette_AdobeSpectrum.json";
import AppleDesign from "../assets/Palette_AppleDesign.json";
import AntV from "../assets/Palette_AntV.json";
import SpectrumDV from "../assets/Palette_AdobeSpectrumDV.json";
import { useCachedState } from "@raycast/utils";

// Define Palette Formate
type Palette = {
  category: string;
  description: string;
  detial: Color[];
};

// Define Color Fromate
type Color = {
  name: string;
  hex: string;
};

// Define Cache of Dynamic Palette
const paletteKey = "generatedPalette";
const paletteCache = new Cache();

// Design System Palettes
const cp_ant: Palette[] = AntDesign;
const cp_arco: Palette[] = ArcoDesign;
const cp_semi: Palette[] = SemiDesign;
const cp_t: Palette[] = Tdesign;
const cp_spe: Palette[] = Spectrum;
const cp_apple: Palette[] = AppleDesign;

// Data Visualization Palettes
const cp_antv: Palette[] = AntV;
const cp_spev: Palette[] = SpectrumDV;

// Other Palettes
const cp_cc: Palette[] = ChineseTraditionalColor;
const cp_oc: Palette[] = OpenColor;

// Main Command
export default function Command() {
  const [palette, setpalette] = useCachedState<Palette[]>("palette", cp_cc);
  const [paletteName, setpaletteName] = useCachedState<string>("paletteName", "chinesetraditionalcolor");
  const paletteRef = useRef(paletteName);

  // Load Dynamic Palette(cp_dg) from Cache, or generate a new Palette
  const [cp_dg, setcp_dg] = useState(() => {
    const cachedPalette = paletteCache.get(paletteKey);

    if (cachedPalette) {
      try {
        return JSON.parse(cachedPalette);
      } catch (error) {
        console.error("Failed to parse cached palette:", error);
      }
    }

    return generatePalettes();
  });
  // When cp_dg change, set current Palette to Cache
  useEffect(() => {
    paletteCache.set(paletteKey, JSON.stringify(cp_dg));
  }, [cp_dg]);

  console.log(paletteRef);

  return (
    <Grid
      columns={2}
      aspectRatio="3/2"
      fit={Grid.Fit.Fill}
      searchBarPlaceholder="Search Colors"
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Built-in Palettes"
          placeholder="Choose Palette"
          storeValue={true}
          onChange={(value) => {
            setpalette(
              value === "chinesetraditionalcolor"
                ? cp_cc
                : value === "opencolor"
                ? cp_oc
                : value === "antdesign"
                ? cp_ant
                : value === "arcodesign"
                ? cp_arco
                : value === "semidesign"
                ? cp_semi
                : value === "tdesign"
                ? cp_t
                : value === "spectrum"
                ? cp_spe
                : value === "appledesign"
                ? cp_apple
                : value === "antv"
                ? cp_antv
                : value === "spectrumv"
                ? cp_spev
                : value === "variants"
                ? cp_dg
                : cp_cc
            );
            paletteRef.current = value;
            setpaletteName(value);
          }}
        >
          <Grid.Dropdown.Section title="Design System Palettes">
            <Grid.Dropdown.Item title="AntDesign" value="antdesign" icon="Icon_AntDesign.svg" />
            <Grid.Dropdown.Item title="ArcoDesign" value="arcodesign" icon="Icon_Arco.svg" />
            <Grid.Dropdown.Item title="SemiDesign" value="semidesign" icon="Icon_Semi.svg" />
            <Grid.Dropdown.Item title="TDesign" value="tdesign" icon="Icon_TDesign.svg" />
            <Grid.Dropdown.Item title="Spectrum" value="spectrum" icon="Icon_AdobeSpectrum.svg" />
            <Grid.Dropdown.Item title="AppleDesign" value="appledesign" icon="Icon_AppleDesign.svg" />
          </Grid.Dropdown.Section>
          <Grid.Dropdown.Section title="Data Visualization Palettes">
            <Grid.Dropdown.Item title="AntV" value="antv" icon="Icon_AntV.svg" />
            <Grid.Dropdown.Item title="SpectrumV" value="spectrumv" icon="Icon_AdobeSpectrum.svg" />
          </Grid.Dropdown.Section>
          <Grid.Dropdown.Section title="Other Palettes">
            <Grid.Dropdown.Item
              title="Chinese Traditional Color"
              value="chinesetraditionalcolor"
              icon="Icon_Default.svg"
            />
            <Grid.Dropdown.Item title="OpenColor" value="opencolor" icon="Icon_OpenColor.svg" />
          </Grid.Dropdown.Section>
          <Grid.Dropdown.Section title="Dynamic Palettes">
            <Grid.Dropdown.Item title="Color Scheme Variants" value="variants" icon="Icon_Variants.png" />
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
    >
      {palette.map((section) => {
        return (
          <Grid.Section columns={8} key={section.category} title={section.category} subtitle={section.description}>
            {section.detial.map((color) => (
              <Grid.Item
                key={color.name}
                title={color.name}
                subtitle={HexToHSL(color.hex)}
                content={{
                  color: {
                    light: color.hex,
                    dark: color.hex,
                    adjustContrast: false,
                  },
                }}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard title="Copy Hex Value" content={color.hex} />
                    <Action.CopyToClipboard
                      title="Copy RGB Value"
                      content={HexToRGB(color.hex)}
                      shortcut={{ modifiers: ["cmd"], key: "return" }}
                    />
                    <Action.CopyToClipboard
                      title={"Copy HSL Value"}
                      content={HexToHSL(color.hex)}
                      shortcut={{ modifiers: ["opt"], key: "return" }}
                    />
                    {paletteRef.current === "variants" && (
                      <Action
                        title="Regenerate Palette"
                        icon={Icon.Repeat}
                        shortcut={{ modifiers: ["cmd", "opt"], key: "r" }}
                        // Clear cache, Generate a new Palette as cp_dg, Rerender the Palette
                        onAction={() => {
                          paletteCache.remove(paletteKey);
                          const newcp_dg = generatePalettes();
                          setcp_dg(newcp_dg);
                          setpalette(newcp_dg);
                        }}
                      />
                    )}
                  </ActionPanel>
                }
              />
            ))}
          </Grid.Section>
        );
      })}
    </Grid>
  );
}

// Hex To HSL
function HexToHSL(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);

  if (!result) {
    throw new Error("Could not parse Hex Color");
  }

  const rHex = parseInt(result[1], 16);
  const gHex = parseInt(result[2], 16);
  const bHex = parseInt(result[3], 16);

  const r = rHex / 255;
  const g = gHex / 255;
  const b = bHex / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);

  let h = (max + min) / 2;
  let s = h;
  let l = h;

  if (max === min) {
    // Achromatic
    return "0,0," + (l * 100).toFixed(0) + "%";
  }

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

  s = s * 100;
  s = Math.round(s);
  l = l * 100;
  l = Math.round(l);
  h = Math.round(360 * h);

  return h + "," + s + "%," + l + "%";
}

// Hex To RGB
function HexToRGB(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);

  if (!result) {
    throw new Error("Could not parse Hex Color");
  }

  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);

  return r + "," + g + "," + b;
}
