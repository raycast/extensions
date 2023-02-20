import { Action, ActionPanel, Grid} from "@raycast/api";
import { useState } from "react";
import cp_ChineseColor from "../assets/Palette_ChineseColor.json"
import cp_OpenColor from "../assets/Plaette_OpenColor.json";
import cp_AntDesign from "../assets/Palette_AntDesign.json";
import cp_ArcoDesign from "../assets/Palette_ArcoDesign.json"
import cp_SemiDesign from "../assets/Palette_SemiDesign.json"
import cp_Tdesign from "../assets/Palette_TDesign.json"
import cp_Spectrum from "../assets/Palette_AdobeSpectrum.json"
import cp_AppleDesign from "../assets/Palette_AppleDesign.json"
import cp_AntV from "../assets/Palette_AntV.json";
import cp_SpectrumDV from "../assets/Palette_AdobeSpectrumDV.json"


type Palette = {
  category: string;
  description: string;
  detial: Color[];
};

type Color = {
  name: string;
  hex: string;
};

//设计色板
const cp_antd: Palette[] = cp_AntDesign;
const cp_bad: Palette[] = cp_ArcoDesign;
const cp_bsd: Palette[] = cp_SemiDesign;
const cp_td: Palette[] = cp_Tdesign;
const cp_as: Palette[] = cp_Spectrum;
const cp_ad: Palette[] = cp_AppleDesign;

//数据可视化色板
const cp_antv: Palette[] = cp_AntV;
const cp_asv: Palette[] = cp_SpectrumDV;

//其它色板
const cp_cc: Palette[] = cp_ChineseColor;
const cp_oc: Palette[] = cp_OpenColor;


export default function Command() {
  const [palette, setPalette] = useState<Palette[]>(cp_cc);

  return (
    <Grid 
      columns={2}
      aspectRatio="3/2"
      fit={Grid.Fit.Fill}
      searchBarPlaceholder = "Search Colors"
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Built-in Palettes"
          placeholder = "Choose Palette" 
          storeValue = {true}
          onChange={(value) => setPalette(
            value === 'chinacolor' ? cp_cc
            : value === 'opencolor' ? cp_oc
            : value === 'antdesign' ? cp_antd
            : value === 'arcodesign' ? cp_bad
            : value === 'semidesign' ? cp_bsd
            : value === 'tdesign' ? cp_td
            : value === 'spectrum' ? cp_as
            : value === 'appledesign' ? cp_ad
            : value === 'antv' ? cp_antv
            : value === 'spectrumv' ? cp_asv
            : cp_cc)}
        >
          <Grid.Dropdown.Section title="Design">
            <Grid.Dropdown.Item title="AntDesign" value="antdesign" icon="Icon_AntDesign.svg"/>
            <Grid.Dropdown.Item title="ArcoDesign" value="arcodesign" icon="Icon_Arco.svg"/>
            <Grid.Dropdown.Item title="SemiDesign" value="semidesign" icon="Icon_Semi.svg"/>
            <Grid.Dropdown.Item title="TDesign" value="tdesign" icon="Icon_TDesign.svg"/>
            <Grid.Dropdown.Item title="Spectrum" value="spectrum" icon="Icon_AdobeSpectrum.svg"/>
            <Grid.Dropdown.Item title="AppleDesign" value="appledesign" icon="Icon_AppleDesign.svg"/>
          </Grid.Dropdown.Section>
          <Grid.Dropdown.Section title="DataVisualization">
            <Grid.Dropdown.Item title="AntV" value="antv" icon="Icon_AntV.svg"/>
            <Grid.Dropdown.Item title="SpectrumV" value="spectrumv" icon="Icon_AdobeSpectrum.svg"/>
          </Grid.Dropdown.Section>
          <Grid.Dropdown.Section title="Other">
            <Grid.Dropdown.Item title="中国传统色" value="chinacolor" icon="Icon_Default.svg"/>
            <Grid.Dropdown.Item title="OpenColor" value="opencolor" icon="Icon_OpenColor.svg"/>
            </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
    >
      {palette.map((section) => {
        return (
          <Grid.Section
            columns={8}  
            key={section.category}
            title={section.category}
            subtitle={section.description}
          >
            {section.detial.map((color) => (
              <ColorItem key={color.name} color={color} />
              ))
            }
          </Grid.Section>
          )
        })}
    </Grid>
  );
}


//  #FFFFFF 格式的颜色值转换为 HSL 格式的颜色值
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
    return "0,0," + (l*100).toFixed(0) + "%";
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

  return h + "," + s + "%," + l +"%";
}


// 将 #FFFFFF 格式的颜色值转换为 RGB 格式的颜色值
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

// 显示 ColorItem 并提供 Copy 不同格式颜色值的动作
function ColorItem(props: { color: Color }) {
  return (
    <Grid.Item
      title={props.color.name}
      subtitle={HexToHSL(props.color.hex)}
      content={{
        color: {
          light: props.color.hex,
          dark: props.color.hex,
          adjustContrast: false,
        },
      }}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Hex" content={props.color.hex} />
          <Action.CopyToClipboard title="Copy RGB" content={HexToRGB(props.color.hex)} shortcut= {{ modifiers: ["cmd"], key: "return" }}/>
          <Action.CopyToClipboard title="Copy HSL" content={HexToHSL(props.color.hex)} shortcut= {{ modifiers: ["opt"], key: "return" }} />
        </ActionPanel>
      }
    />
  );
}
