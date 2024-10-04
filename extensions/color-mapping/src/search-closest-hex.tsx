import { List, ActionPanel, Action, getPreferenceValues } from "@raycast/api";
import { useState, useMemo } from "react";

interface Preferences {
  colorList: string;
}

interface ColorGroup {
  [shade: string]: string;
}

interface ColorList {
  [groupName: string]: ColorGroup;
}

/**
 * Converts a hex color string to RGB values
 * @param hex - The hex color string
 * @returns An array of RGB values or null if invalid
 */
function hexToRgb(hex: string): [number, number, number] | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : null;
}

/**
 * Calculates the Euclidean distance between two colors in RGB space
 * @param color1 - The first color as RGB values
 * @param color2 - The second color as RGB values
 * @returns The distance between the two colors
 */
function colorDistance(color1: [number, number, number], color2: [number, number, number]): number {
  return Math.sqrt(
    Math.pow(color1[0] - color2[0], 2) + Math.pow(color1[1] - color2[1], 2) + Math.pow(color1[2] - color2[2], 2),
  );
}

/**
 * Parses a Tailwind-style color list string into a ColorList object
 * @param input - The input string containing the color list
 * @returns A ColorList object
 */
function parseColorList(input: string): ColorList {
  try {
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
      throw new Error("Failed to parse color list");
    }

    return result;
  } catch (error) {
    console.error("Error parsing color list:", error);
    return {};
  }
}

/**
 * Validates a hex color string
 * @param color - The hex color string to validate
 * @returns True if valid, false otherwise
 */
function isValidHexColor(color: string): boolean {
  return /^#?([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const { colorList = "{}" } = getPreferenceValues<Preferences>();

  const parsedColorList = useMemo(() => parseColorList(colorList), [colorList]);

  const closestColor = useMemo(() => {
    if (!isValidHexColor(searchText)) return null;

    const inputRgb = hexToRgb(searchText);
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
  }, [searchText, parsedColorList]);

  return (
    <List onSearchTextChange={setSearchText} searchBarPlaceholder="Enter a hex color value..." throttle>
      {Object.keys(parsedColorList).length === 0 ? (
        <List.EmptyView
          title="No valid color list provided"
          description="Please add a valid Tailwind-style color list in the extension preferences."
        />
      ) : searchText && !closestColor ? (
        <List.EmptyView title="No matching color found" description="Try entering a valid hex color value." />
      ) : closestColor ? (
        <List.Section title="Color Comparison">
          <List.Item
            title="Input Color"
            subtitle={searchText}
            icon={{ source: `https://singlecolorimage.com/get/${searchText.replace("#", "")}/64x64` }}
            accessories={[{ text: searchText }]}
          />
          <List.Item
            title="Closest Match"
            subtitle={`${closestColor.group}-${closestColor.shade}`}
            icon={{ source: `https://singlecolorimage.com/get/${closestColor.color.replace("#", "")}/64x64` }}
            accessories={[{ text: closestColor.color }]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  content={`${closestColor.group}-${closestColor.shade}`.trim().replace(/\s/g, "")}
                  shortcut={{ modifiers: ["cmd"], key: "." }}
                />
                <Action.CopyToClipboard content={closestColor.color} shortcut={{ modifiers: ["cmd"], key: "," }} />
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
