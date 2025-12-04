import { Action, ActionPanel, getPreferenceValues, Grid, Keyboard, PreferenceValues } from "@raycast/api";
import { hex } from "color-convert";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import colors from "tailwindcss/colors";
import { capitalize } from "lodash";
import { useEffect, useState } from "react";

import { moveFirstMatchToFront } from "./utils/move-to-front-extension";

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

const preferences = getPreferenceValues();

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
        .filter(([name, shades]) => Object.keys(shades).length > 0);
      console.log(filteredShades);
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
  preferences: PreferenceValues;
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
          shortcut: { modifiers: ["cmd", "opt"], key: "n" } as Keyboard.Shortcut,
        },
        {
          id: "bg-class",
          title: "Copy Background Class",
          content: `bg-${name}-${shade}`,
          shortcut: { modifiers: ["cmd", "opt"], key: "b" } as Keyboard.Shortcut,
        },
        {
          id: "text-class",
          title: "Copy Text Class",
          content: `text-${name}-${shade}`,
          shortcut: { modifiers: ["cmd", "opt"], key: "t" } as Keyboard.Shortcut,
        },
        {
          id: "border-class",
          title: "Copy Border Class",
          content: `border-${name}-${shade}`,
          shortcut: { modifiers: ["cmd", "opt"], key: "o" } as Keyboard.Shortcut,
        },
        {
          id: "shadow-class",
          title: "Copy Shadow Class",
          content: `shadow-${name}-${shade}`,
          shortcut: { modifiers: ["cmd", "opt"], key: "a" } as Keyboard.Shortcut,
        },
        {
          id: "ring-class",
          title: "Copy Ring Class",
          content: `ring-${name}-${shade}`,
          shortcut: { modifiers: ["cmd", "opt"], key: "i" } as Keyboard.Shortcut,
        },
        {
          id: "outline-class",
          title: "Copy Outline Class",
          content: `outline-${name}-${shade}`,
          shortcut: { modifiers: ["cmd", "opt"], key: "u" } as Keyboard.Shortcut,
        },
      ],
    },
    {
      actions: [
        {
          id: "value-hex",
          title: "Copy Hex Value",
          content: value,
          shortcut: { modifiers: ["cmd", "opt"], key: "h" } as Keyboard.Shortcut,
        },
        {
          id: "value-rgb",
          title: "Copy RGB Value",
          content: `rgb(${hex.rgb(value)})`,
          shortcut: { modifiers: ["cmd", "opt"], key: "r" } as Keyboard.Shortcut,
        },
        {
          id: "value-hsl",
          title: "Copy HSL Value",
          content: `hsl(${hex.hsl(value)})`,
          shortcut: { modifiers: ["cmd", "opt"], key: "s" } as Keyboard.Shortcut,
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
