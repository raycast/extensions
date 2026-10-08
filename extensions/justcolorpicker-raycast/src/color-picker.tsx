import React, { useState, useEffect } from "react";
import { List, ActionPanel, Action } from "@raycast/api";
import { colord, extend, Colord } from "colord";
import cmykPlugin from "colord/plugins/cmyk";
import labPlugin from "colord/plugins/lab";
import lchPlugin from "colord/plugins/lch";
import hwbPlugin from "colord/plugins/hwb";

extend([cmykPlugin, labPlugin, lchPlugin, hwbPlugin]);

const baseUrl = "https://justcolorpicker.com";

type ColorFormat =
  | "hsl"
  | "hwb"
  | "rgb"
  | "rgba"
  | "lab"
  | "lch"
  | "device-cmyk"
  | "hex";

function identifyColorFormat(input: string): string {
  // 检查输入是否为空
  if (!input || input.trim() === "") {
    return "#000000";
  }

  // 移除所有多余的空格
  const cleanedInput = input.trim().replace(/\s+/g, " ");

  // 检查是否已经是标准CSS格式
  const cssFormatRegex = /^(hsl|hwb|rgb|rgba|lab|lch|device-cmyk)\s*\(/i;
  if (cssFormatRegex.test(cleanedInput)) {
    // 确保格式正确（例如：添加缺失的括号）
    const format = cleanedInput.split(/\s*\(/)[0].toLowerCase();
    const values = cleanedInput.replace(/^[^\\(]+\(|\)$/g, "");
    return `${format}(${values})`;
  }

  // 分割输入字符串，同时考虑空格、逗号和斜杠分隔
  const parts = cleanedInput.split(/[\s,/]+/).filter((part) => part !== "");

  // 识别颜色格式
  let format: ColorFormat;
  try {
    if (parts.length === 3 || parts.length === 4) {
      const [first, second, third] = parts;
      if (parts.every((part) => part.endsWith("%"))) {
        format = parts.length === 4 ? "device-cmyk" : "hwb";
      } else if (
        first.includes("°") ||
        (!isNaN(parseFloat(first)) &&
          parseFloat(first) <= 360 &&
          second.endsWith("%") &&
          third.endsWith("%"))
      ) {
        format = "hsl";
      } else if (
        parts.every(
          (part) => !isNaN(parseFloat(part)) && parseFloat(part) <= 255,
        )
      ) {
        format = parts.length === 4 ? "rgba" : "rgb";
      } else if (parts.length === 3) {
        if (parts[0].includes("%")) {
          format = "lch";
        } else {
          format = "lab";
        }
      } else {
        return "#000000";
      }
    } else if (parts.length === 1 && /^#?[0-9A-Fa-f]{3,8}$/.test(parts[0])) {
      format = "hex";
    } else {
      return "#000000";
    }
  } catch (error) {
    return "#000000";
  }

  // 构建标准CSS色值
  let result: string;
  switch (format) {
    case "rgb":
    case "rgba":
      result = `${format}(${parts.join(", ")})`;
      break;
    case "hsl":
      if (parts.length === 4) {
        result = `hsl(${parts[0]} ${parts[1]} ${parts[2]} / ${parts[3]})`;
      } else {
        result = `hsl(${parts.join(" ")})`;
      }
      break;
    case "hex":
      result = parts[0].startsWith("#") ? parts[0] : `#${parts[0]}`;
      break;
    default:
      result = `${format}(${parts.join(" ")})`;
  }
  return result;
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [colorItems, setColorItems] = useState<ColorItem[]>([]);

  useEffect(() => {
    parseColor(searchText);
  }, [searchText]);

  // 实现颜色解析逻辑
  /**
   * 有可能的值
   * #fff, fff, #ffffff = 解析为十六进制 HEX
   * rgb(255,0,0), 255,0,0 = 解析为 RGB
   * rgba(255,0,0,0.5), 255,0,0,0.5 = 解析为 RGBA
   * hsl(120, 100%, 50%), 120, 100%, 50% = 解析为 HSL
   * hwb(120, 100%, 50%), 120, 100%, 50% = 解析为 HWB
   * device-cmyk(120, 100%, 50%, 10%), 120, 100%, 50%, 10% = 解析为 CMYK
   * @NODE 目前没兼容以下两种格式
   * lab(120, 100%, 50%), 120, 100%, 50% = 解析为 LAB
   * lch(120, 100%, 50%), 120, 100%, 50% = 解析为 LCH
   */
  function parseColor(input: string) {
    // 移除首尾空格,但保留内部空格
    input = input.trim();

    let parsedColor: string | null = null;

    // 解析 HEX
    if (
      input.startsWith("#") ||
      /^[0-9A-Fa-f]{3}$|^[0-9A-Fa-f]{6}$/.test(input)
    ) {
      if (input.length === 3 || input.length === 4) {
        parsedColor = `#${input
          .slice(input.startsWith("#") ? 1 : 0)
          .split("")
          .map((c) => c + c)
          .join("")}`;
      } else {
        parsedColor = input.startsWith("#") ? input : `#${input}`;
      }
    } else {
      parsedColor = identifyColorFormat(input) as string;
    }

    console.log("parsedColor", parsedColor);
    if (parsedColor) {
      const color = colord(parsedColor);
      if (color.isValid()) {
        updateColorItems(color);
      }
    }
  }

  function updateColorItems(color: Colord) {
    const isAlpha = color.alpha() < 1;
    const lab = color.toLab();
    const l = `${lab.l} ${lab.a} ${lab.b}`;
    const labString = isAlpha ? `lab(${l} / ${lab.alpha})` : `lab(${l})`;

    const hslObj = color.toHsl();
    const hsl = isAlpha
      ? `hsl(${hslObj.h} ${hslObj.s}% ${hslObj.l}% / ${hslObj.a})`
      : color.toHslString().replace(/,/g, "");

    const items: ColorItem[] = [
      { format: "HEX", value: color.toHex() },
      { format: "RGB", value: color.toRgbString() },
      { format: "HSL", value: hsl },
      { format: "HWB", value: color.toHwbString() },
      { format: "CMYK", value: color.toCmykString() },
      { format: "LAB", value: labString },
      { format: "LCH", value: color.toLchString() },
    ];
    setColorItems(items);
  }

  return (
    <List
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Enter color value (e.g., #fff, rgb(255,0,0))"
      isShowingDetail
    >
      {colorItems.map((item) => (
        <ColorListItem
          key={item.format}
          item={item}
          hex={colorItems[0].value}
        />
      ))}
    </List>
  );
}

function ColorListItem({ item, hex }: { item: ColorItem; hex: string }) {
  return (
    <List.Item
      title={item.format}
      subtitle={item.value}
      detail={
        <List.Item.Detail
          markdown={`![${hex}](${baseUrl}/api/colorpng?raycast-width=350&raycast-height=350&c=${hex.replace("#", "")})`}
        />
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy" content={item.value} />
          <Action.OpenInBrowser
            title="Open in Justcolorpicker"
            shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
            url={`${baseUrl}?c=${encodeURIComponent(hex)}`}
          />
        </ActionPanel>
      }
    />
  );
}

interface ColorItem {
  format: string;
  value: string;
}
