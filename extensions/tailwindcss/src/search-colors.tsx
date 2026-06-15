import { Action, ActionPanel, getPreferenceValues, Grid, Keyboard } from "@raycast/api";
import { converter, formatHex, parse } from "culori";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import colors from "tailwindcss/colors";
import { capitalize } from "lodash";
import { useEffect, useState } from "react";

import { moveFirstMatchToFront } from "./utils/move-to-front-extension";

type ColorPalette = Record<string, string>;
const colorEntries = Object.entries(colors) as [string, ColorPalette][];

const toRgb = converter("rgb");
const toHsl = converter("hsl");
const toOklch = converter("oklch");

function toHex(value: string): string {
  if (value.startsWith("#")) return value;
  const parsed = parse(value);
  return parsed ? formatHex(parsed) : value;
}

function formatRgb(color: string): string {
  const rgb = toRgb(color);
  return rgb ? `rgb(${Math.round(rgb.r * 255)},${Math.round(rgb.g * 255)},${Math.round(rgb.b * 255)})` : color;
}

function formatHsl(color: string): string {
  const hsl = toHsl(color);
  return hsl ? `hsl(${Math.round(hsl.h ?? 0)},${Math.round(hsl.s * 100)}%,${Math.round(hsl.l * 100)}%)` : color;
}

function formatOklch(color: string): string {
  const oklch = toOklch(color);
  return oklch ? `oklch(${+(oklch.l * 100).toFixed(2)}% ${+oklch.c.toFixed(4)} ${+(oklch.h ?? 0).toFixed(2)})` : color;
}

const hiddenColors = ["inherit", "current", "transparent", "black", "white"];

const preferences = getPreferenceValues<Preferences.SearchColors>();

export default function SearchColors() {
  const [searchText, setSearchText] = useState("");
  const [filteredColors, filterColors] = useState(colorEntries);

  useEffect(() => {
    if (!searchText) {
      filterColors(colorEntries);
      return;
    }
    if (searchText.match(/^\d/)) {
      const filteredShades = colorEntries
        .map(([name, shades]) => {
          const t = Object.entries(shades).filter(([shade]) => shade.includes(searchText));
          return [name, Object.fromEntries(t)];
        })
        .filter(([, shades]) => Object.keys(shades).length > 0);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      filterColors(filteredShades as any);
      return;
    }
    filterColors(colorEntries.filter(([name]) => name.includes(searchText)));
  }, [searchText]);
  return (
    <Grid searchBarPlaceholder="Search colors by name and shade..." columns={8} onSearchTextChange={setSearchText}>
      {filteredColors
        .filter(([name]) => !hiddenColors.includes(name))
        .map(([name, shades]) => (
          <Grid.Section key={name} title={capitalize(name)}>
            {Object.entries(shades).map(([shade, value]) => {
              const hexValue = toHex(value as string);
              return (
                <Grid.Item
                  key={shade}
                  title={shade}
                  subtitle={hexValue}
                  content={{
                    color: {
                      light: hexValue,
                      dark: hexValue,
                      adjustContrast: false,
                    },
                  }}
                  keywords={[
                    name,
                    name + shade,
                    `${name} ${shade}`,
                    `${name}-${shade}`,
                    hexValue,
                    hexValue.replace("#", ""),
                  ]}
                  actions={
                    <Actions
                      preferences={preferences}
                      name={name}
                      shade={shade}
                      value={value as string}
                      hexValue={hexValue}
                    />
                  }
                />
              );
            })}
          </Grid.Section>
        ))}
    </Grid>
  );
}

function Actions({
  preferences,
  name,
  shade,
  value,
  hexValue,
}: {
  preferences: Preferences.SearchColors;
  name: string;
  shade: string;
  value: string;
  hexValue: string;
}) {
  let sections = [
    {
      actions: [
        {
          id: "color-name",
          title: "Copy color name",
          content: `${name}-${shade}`,
          shortcut: {
            macOS: { modifiers: ["cmd", "opt"], key: "n" },
            Windows: { modifiers: ["ctrl", "alt"], key: "n" },
          } as Keyboard.Shortcut,
        },
        {
          id: "bg-class",
          title: "Copy Background Class",
          content: `bg-${name}-${shade}`,
          shortcut: {
            macOS: { modifiers: ["cmd", "opt"], key: "b" },
            Windows: { modifiers: ["ctrl", "alt"], key: "b" },
          } as Keyboard.Shortcut,
        },
        {
          id: "text-class",
          title: "Copy Text Class",
          content: `text-${name}-${shade}`,
          shortcut: {
            macOS: { modifiers: ["cmd", "opt"], key: "t" },
            Windows: { modifiers: ["ctrl", "alt"], key: "t" },
          } as Keyboard.Shortcut,
        },
        {
          id: "border-class",
          title: "Copy Border Class",
          content: `border-${name}-${shade}`,
          shortcut: {
            macOS: { modifiers: ["cmd", "opt"], key: "o" },
            Windows: { modifiers: ["ctrl", "alt"], key: "o" },
          } as Keyboard.Shortcut,
        },
        {
          id: "shadow-class",
          title: "Copy Shadow Class",
          content: `shadow-${name}-${shade}`,
          shortcut: {
            macOS: { modifiers: ["cmd", "opt"], key: "a" },
            Windows: { modifiers: ["ctrl", "alt"], key: "a" },
          } as Keyboard.Shortcut,
        },
        {
          id: "ring-class",
          title: "Copy Ring Class",
          content: `ring-${name}-${shade}`,
          shortcut: {
            macOS: { modifiers: ["cmd", "opt"], key: "i" },
            Windows: { modifiers: ["ctrl", "alt"], key: "i" },
          } as Keyboard.Shortcut,
        },
        {
          id: "outline-class",
          title: "Copy Outline Class",
          content: `outline-${name}-${shade}`,
          shortcut: {
            macOS: { modifiers: ["cmd", "opt"], key: "u" },
            Windows: { modifiers: ["ctrl", "alt"], key: "u" },
          } as Keyboard.Shortcut,
        },
      ],
    },
    {
      actions: [
        {
          id: "value-hex",
          title: "Copy Hex Value",
          content: hexValue,
          shortcut: {
            macOS: { modifiers: ["cmd", "opt"], key: "h" },
            Windows: { modifiers: ["ctrl", "alt"], key: "h" },
          } as Keyboard.Shortcut,
        },
        {
          id: "value-rgb",
          title: "Copy RGB Value",
          content: formatRgb(value),
          shortcut: {
            macOS: { modifiers: ["cmd", "opt"], key: "r" },
            Windows: { modifiers: ["ctrl", "alt"], key: "r" },
          } as Keyboard.Shortcut,
        },
        {
          id: "value-hsl",
          title: "Copy HSL Value",
          content: formatHsl(value),
          shortcut: {
            macOS: { modifiers: ["cmd", "opt"], key: "s" },
            Windows: { modifiers: ["ctrl", "alt"], key: "s" },
          } as Keyboard.Shortcut,
        },
        {
          id: "value-oklch",
          title: "Copy OKLCH Value",
          content: formatOklch(value),
          shortcut: {
            macOS: { modifiers: ["cmd", "opt"], key: "l" },
            Windows: { modifiers: ["ctrl", "alt"], key: "l" },
          } as Keyboard.Shortcut,
        },
      ],
    },
  ].map((section) => {
    return {
      ...section,
      actions: moveFirstMatchToFront(section.actions, (action) => action.id === preferences.defaultAction),
    };
  });

  sections = moveFirstMatchToFront(sections, (section) =>
    section.actions.some((action) => action.id === preferences.defaultAction),
  );

  return (
    <ActionPanel>
      {sections.map((section, index) => {
        return (
          <ActionPanel.Section key={`section-${index}`}>
            {section.actions.map((action) => (
              <Action.CopyToClipboard
                key={`${action.id}-action`}
                title={action.title}
                content={action.content}
                shortcut={action.shortcut}
              />
            ))}
          </ActionPanel.Section>
        );
      })}
    </ActionPanel>
  );
}
