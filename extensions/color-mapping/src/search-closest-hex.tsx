import { List, ActionPanel, Action, getPreferenceValues } from "@raycast/api";
import { useState } from "react";

interface Preferences {
  colorList: string;
}

interface ColorGroup {
  [shade: string]: string;
}

interface ColorList {
  [groupName: string]: ColorGroup;
}

function hexToRgb(hex: string): [number, number, number] | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : null;
}
function colorDistance(color1: [number, number, number], color2: [number, number, number]): number {
  return Math.sqrt(
    Math.pow(color1[0] - color2[0], 2) + Math.pow(color1[1] - color2[1], 2) + Math.pow(color1[2] - color2[2], 2),
  );
}
function parseColorList(input: string): ColorList {
  const result: ColorList = {};
  const groupRegex = /"?(\w+(?:-\w+)?)"?\s*:\s*{([^}]+)}/g;
  const shadeRegex = /(\d+)\s*:\s*"?(#[A-Fa-f0-9]{6})"?/g;

  let match;
  while ((match = groupRegex.exec(input)) !== null) {
    const groupName = match[1];
    const groupContent = match[2];
    result[groupName] = {};

    let shadeMatch;
    while ((shadeMatch = shadeRegex.exec(groupContent)) !== null) {
      const shade = shadeMatch[1];
      const color = shadeMatch[2];
      result[groupName][shade] = color;
    }
  }

  if (Object.keys(result).length === 0) {
    console.error("Failed to parse color list:", input);
  }

  return result;
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const { colorList = "{}" } = getPreferenceValues<Preferences>();

  const parsedColorList = parseColorList(colorList);

  const closestColor = (inputColor: string) => {
    const inputRgb = hexToRgb(inputColor);
    if (!inputRgb) return null;

    let closest = { group: "", shade: "", color: "" };
    let minDistance = Infinity;

    Object.entries(parsedColorList).forEach(([groupName, colorGroup]) => {
      Object.entries(colorGroup).forEach(([shade, color]) => {
        const colorRgb = hexToRgb(color);
        if (colorRgb) {
          const distance = colorDistance(inputRgb, colorRgb);
          if (distance < minDistance) {
            minDistance = distance;
            closest = { group: groupName, shade, color };
          }
        }
      });
    });

    return closest.color ? closest : null;
  };

  const closest = searchText ? closestColor(searchText) : null;

  return (
    <List onSearchTextChange={setSearchText} searchBarPlaceholder="Enter a hex color value...">
      {Object.keys(parsedColorList).length === 0 ? (
        <List.EmptyView
          title="No valid color list provided"
          description="Please add a valid Tailwind-style color list in the extension preferences."
        />
      ) : searchText && !closest ? (
        <List.EmptyView title="No matching color found" description="Try entering a valid hex color value." />
      ) : closest ? (
        <List.Section title="Color Comparison">
          <List.Item
            title="Input Color"
            subtitle={searchText}
            icon={{ source: `https://singlecolorimage.com/get/${searchText.replace("#", "")}/64x64` }}
            accessories={[{ text: searchText }]}
          />
          <List.Item
            title="Closest Match"
            subtitle={`${closest.group}-${closest.shade}`}
            icon={{ source: `https://singlecolorimage.com/get/${closest.color.replace("#", "")}/64x64` }}
            accessories={[{ text: closest.color }]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={`${closest.group}-${closest.shade}`.trim().replace(/\s/g, "")} />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : (
        <List.EmptyView title="Enter a hex color" description="Type a hex color value to find the closest match." />
      )}
    </List>
  );
}
