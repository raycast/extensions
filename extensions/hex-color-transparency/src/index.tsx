import { useState } from "react";
import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";

const TRANSPARENCY_VALUES: { percent: number; hex: string }[] = [
  { percent: 100, hex: "FF" },
  { percent: 99, hex: "FC" },
  { percent: 98, hex: "FA" },
  { percent: 97, hex: "F7" },
  { percent: 96, hex: "F5" },
  { percent: 95, hex: "F2" },
  { percent: 94, hex: "F0" },
  { percent: 93, hex: "ED" },
  { percent: 92, hex: "EB" },
  { percent: 91, hex: "E8" },
  { percent: 90, hex: "E6" },
  { percent: 89, hex: "E3" },
  { percent: 88, hex: "E0" },
  { percent: 87, hex: "DE" },
  { percent: 86, hex: "DB" },
  { percent: 85, hex: "D9" },
  { percent: 84, hex: "D6" },
  { percent: 83, hex: "D4" },
  { percent: 82, hex: "D1" },
  { percent: 81, hex: "CF" },
  { percent: 80, hex: "CC" },
  { percent: 79, hex: "C9" },
  { percent: 78, hex: "C7" },
  { percent: 77, hex: "C4" },
  { percent: 76, hex: "C2" },
  { percent: 75, hex: "BF" },
  { percent: 74, hex: "BD" },
  { percent: 73, hex: "BA" },
  { percent: 72, hex: "B8" },
  { percent: 71, hex: "B5" },
  { percent: 70, hex: "B3" },
  { percent: 69, hex: "B0" },
  { percent: 68, hex: "AD" },
  { percent: 67, hex: "AB" },
  { percent: 66, hex: "A8" },
  { percent: 65, hex: "A6" },
  { percent: 64, hex: "A3" },
  { percent: 63, hex: "A1" },
  { percent: 62, hex: "9E" },
  { percent: 61, hex: "9C" },
  { percent: 60, hex: "99" },
  { percent: 59, hex: "96" },
  { percent: 58, hex: "94" },
  { percent: 57, hex: "91" },
  { percent: 56, hex: "8F" },
  { percent: 55, hex: "8C" },
  { percent: 54, hex: "8A" },
  { percent: 53, hex: "87" },
  { percent: 52, hex: "85" },
  { percent: 51, hex: "82" },
  { percent: 50, hex: "80" },
  { percent: 49, hex: "7D" },
  { percent: 48, hex: "7A" },
  { percent: 47, hex: "78" },
  { percent: 46, hex: "75" },
  { percent: 45, hex: "73" },
  { percent: 44, hex: "70" },
  { percent: 43, hex: "6E" },
  { percent: 42, hex: "6B" },
  { percent: 41, hex: "69" },
  { percent: 40, hex: "66" },
  { percent: 39, hex: "63" },
  { percent: 38, hex: "61" },
  { percent: 37, hex: "5E" },
  { percent: 36, hex: "5C" },
  { percent: 35, hex: "59" },
  { percent: 34, hex: "57" },
  { percent: 33, hex: "54" },
  { percent: 32, hex: "52" },
  { percent: 31, hex: "4F" },
  { percent: 30, hex: "4D" },
  { percent: 29, hex: "4A" },
  { percent: 28, hex: "47" },
  { percent: 27, hex: "45" },
  { percent: 26, hex: "42" },
  { percent: 25, hex: "40" },
  { percent: 24, hex: "3D" },
  { percent: 23, hex: "3B" },
  { percent: 22, hex: "38" },
  { percent: 21, hex: "36" },
  { percent: 20, hex: "33" },
  { percent: 19, hex: "30" },
  { percent: 18, hex: "2E" },
  { percent: 17, hex: "2B" },
  { percent: 16, hex: "29" },
  { percent: 15, hex: "26" },
  { percent: 14, hex: "24" },
  { percent: 13, hex: "21" },
  { percent: 12, hex: "1F" },
  { percent: 11, hex: "1C" },
  { percent: 10, hex: "1A" },
  { percent: 9, hex: "17" },
  { percent: 8, hex: "14" },
  { percent: 7, hex: "12" },
  { percent: 6, hex: "0F" },
  { percent: 5, hex: "0D" },
  { percent: 4, hex: "0A" },
  { percent: 3, hex: "08" },
  { percent: 2, hex: "05" },
  { percent: 1, hex: "03" },
  { percent: 0, hex: "00" },
];

const HEX_COLOR_REGEX = /^#?([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

function normalizeColor(input: string): string | null {
  const match = input.match(HEX_COLOR_REGEX);
  if (!match) return null;

  let hex = match[1].toUpperCase();

  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }

  return hex;
}

function looksLikeColor(raw: string): boolean {
  if (raw.startsWith("#")) return true;
  // Without #, the only 3-digit percentage is "100" — treat everything else as a color
  if (raw.length === 3) return raw !== "100";
  return true;
}

function parseSearch(text: string): { color: string | null; filter: string } {
  const trimmed = text.trim();
  const match = trimmed.match(/^(#?[0-9A-Fa-f]{6}|#?[0-9A-Fa-f]{3})\s*(.*)/);

  if (match && looksLikeColor(match[1]) && normalizeColor(match[1])) {
    return { color: normalizeColor(match[1]), filter: match[2].trim() };
  }
  return { color: null, filter: trimmed };
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const { color: baseColor, filter } = parseSearch(searchText);

  const filtered = filter
    ? TRANSPARENCY_VALUES.filter(({ percent }) => String(percent) === filter)
    : TRANSPARENCY_VALUES;

  return (
    <List
      searchBarPlaceholder="Paste a hex color or filter by percentage…"
      filtering={false}
      onSearchTextChange={setSearchText}
    >
      {filtered.map(({ percent, hex }) => {
        const combined = baseColor ? `#${baseColor}${hex}` : null;

        const accessories: List.Item.Accessory[] = [];
        if (combined) {
          accessories.push({ tag: combined });
          accessories.push({
            icon: {
              source: Icon.CircleFilled,
              tintColor: {
                light: `#${baseColor}${hex}`,
                dark: `#${baseColor}${hex}`,
              } as Color.ColorLike,
            },
          });
        }

        return (
          <List.Item
            key={percent}
            title={`${percent}%`}
            subtitle={hex}
            accessories={accessories}
            actions={
              <ActionPanel>
                {combined ? (
                  <>
                    <Action.CopyToClipboard
                      title="Copy Combined Color"
                      content={combined}
                    />
                    <Action.CopyToClipboard
                      title="Copy Hex Value"
                      content={hex}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    />
                    <Action.Paste
                      title="Paste Combined Color"
                      content={combined}
                    />
                  </>
                ) : (
                  <>
                    <Action.CopyToClipboard
                      title="Copy Hex Value"
                      content={hex}
                    />
                    <Action.Paste title="Paste Hex Value" content={hex} />
                  </>
                )}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
