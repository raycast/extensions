import { Action, ActionPanel, getPreferenceValues, Grid, Keyboard } from "@raycast/api";
import { hex } from "color-convert";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import tailwindColors from "tailwindcss/colors";
import { capitalize } from "lodash";
import { useEffect, useState } from "react";

import { moveFirstMatchToFront } from "./utils/move-to-front-extension";

const customColors = {
  mauve: {
    50: "#fafafa",
    100: "#f3f1f3",
    200: "#e7e4e7",
    300: "#d7d0d7",
    400: "#a89ea9",
    500: "#79697b",
    600: "#594c5b",
    700: "#463947",
    800: "#2a212c",
    900: "#1d161e",
    950: "#0c090c",
  },
  olive: {
    50: "#fbfbf9",
    100: "#f4f4f0",
    200: "#e8e8e3",
    300: "#d8d8d0",
    400: "#abab9c",
    500: "#7c7c67",
    600: "#5b5b4b",
    700: "#474739",
    800: "#2b2b22",
    900: "#1d1d16",
    950: "#0c0c09",
  },
  mist: {
    50: "#f9fbfb",
    100: "#f1f3f3",
    200: "#e3e7e8",
    300: "#d0d6d8",
    400: "#9ca8ab",
    500: "#67787c",
    600: "#4b585b",
    700: "#394447",
    800: "#22292b",
    900: "#161b1d",
    950: "#090b0c",
  },
  taupe: {
    50: "#fbfaf9",
    100: "#f3f1f1",
    200: "#e8e4e3",
    300: "#d8d2d0",
    400: "#aba09c",
    500: "#7c6d67",
    600: "#5b4f4b",
    700: "#473c39",
    800: "#2b2422",
    900: "#1d1816",
    950: "#0c0a09",
  },
};

const tailwindEntries = Object.entries(tailwindColors);
const stoneIndex = tailwindEntries.findIndex(([name]) => name === "stone");
const customEntries = Object.entries(customColors);
const colors = Object.fromEntries([
  ...tailwindEntries.slice(0, stoneIndex + 1),
  ...customEntries,
  ...tailwindEntries.slice(stoneIndex + 1),
]);

const hiddenColors = [
  "inherit",
  "current",
  "transparent",
  "black",
  "white",
  "lightBlue",
  "coolGray",
  "trueGray",
  "warmGray",
  "blueGray",
];

const preferences = getPreferenceValues<Preferences.SearchColors>();

export default function SearchColors() {
  const [searchText, setSearchText] = useState("");
  const [filteredColors, filterColors] = useState(Object.entries(colors));

  useEffect(() => {
    // If there's no search text, show all colors
    if (!searchText) {
      filterColors(Object.entries(colors));
      return;
    }
    // If the search text starts with a number, we assume it's a shade
    if (searchText.match(/^\d/)) {
      const filteredShades = Object.entries(colors)
        .map(([name, shades]) => {
          const t = Object.entries(shades).filter(([shade]) => shade.includes(searchText));
          return [name, Object.fromEntries(t)];
        })
        .filter(([, shades]) => Object.keys(shades).length > 0);
      console.log(filteredShades);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      filterColors(filteredShades as any);
      return;
    }
    // Otherwise, we assume it's a color name
    filterColors(Object.entries(colors).filter(([name]) => name.includes(searchText)));
  }, [searchText]);
  return (
    <Grid searchBarPlaceholder="Search colors by name and shade..." columns={8} onSearchTextChange={setSearchText}>
      {filteredColors
        .filter(([name]) => !hiddenColors.includes(name))
        .map(([name, shades]) => (
          <Grid.Section key={name} title={capitalize(name)}>
            {Object.entries(shades).map(([shade, value]) => (
              <Grid.Item
                key={shade}
                title={shade}
                subtitle={value as string}
                content={{
                  color: {
                    light: value as string,
                    dark: value as string,
                    adjustContrast: false,
                  },
                }}
                keywords={[
                  name,
                  name + shade,
                  `${name} ${shade}`,
                  `${name}-${shade}`,
                  value as string,
                  (value as string).replace("#", ""),
                ]}
                actions={<Actions preferences={preferences} name={name} shade={shade} value={value as string} />}
              />
            ))}
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
}: {
  preferences: Preferences.SearchColors;
  name: string;
  shade: string;
  value: string;
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
          content: value,
          shortcut: {
            macOS: { modifiers: ["cmd", "opt"], key: "h" },
            Windows: { modifiers: ["ctrl", "alt"], key: "h" },
          } as Keyboard.Shortcut,
        },
        {
          id: "value-rgb",
          title: "Copy RGB Value",
          content: `rgb(${hex.rgb(value)})`,
          shortcut: {
            macOS: { modifiers: ["cmd", "opt"], key: "r" },
            Windows: { modifiers: ["ctrl", "alt"], key: "r" },
          } as Keyboard.Shortcut,
        },
        {
          id: "value-hsl",
          title: "Copy HSL Value",
          content: `hsl(${hex.hsl(value)})`,
          shortcut: {
            macOS: { modifiers: ["cmd", "opt"], key: "s" },
            Windows: { modifiers: ["ctrl", "alt"], key: "s" },
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
