import { encode } from "js-base64";
import { memo, useMemo } from "react";

import { Grid, Icon } from "@raycast/api";

import { CharacterActionPanel } from "@/components/CharacterActionPanel";
import { useListContext } from "@/context/ListContext";
import type { Character } from "@/lib/dataset-manager";
import { gridColumnNumber } from "@/lib/preferences";
import { numberToHex, upperCaseFirst } from "@/utils/string";

import DataSetSelector from "./DataSetSelector";

const getSquare = (value: string, dark = false) => {
  let val = value;
  if (value === "&") {
    val = "&amp;";
  } else if (value === "<") {
    val = "&lt;";
  } else if (value === ">") {
    val = "&gt;";
  }
  const textColor = dark ? "#fff" : "#000";
  const size = 200;
  return `
  <svg height="${size}" width="${size}">
    <rect fill="transparent" x="0" y="0" width="${size}" height="${size}"></rect>
    <text x="${size / 2}" y="${
      size / 1.3
    }" fill="${textColor}" text-anchor="middle" alignment-baseline="central" font-size="${
      size / 2
    }" line-height="0" font-family="mono-space">${val}</text>
  </svg>
  `;
};

const GridItem = memo(({ item }: { item: Character }) => {
  const [light, dark] = useMemo(() => {
    return [
      `data:image/svg+xml;base64,${encode(getSquare(item.value))}`,
      `data:image/svg+xml;base64,${encode(getSquare(item.value, true))}`,
    ];
  }, [item]);
  const gridItemTooltip: string = useMemo(
    () =>
      [
        `Name: ${upperCaseFirst(item.name)}`,
        `Dec: ${item.code}`,
        `Hex: ${numberToHex(item.code)}`,
        item.aliases?.length ? `Aliases: "${item.aliases.map(upperCaseFirst).join(", ")}"` : "",
      ].join("\n"),
    [item],
  );

  return (
    <Grid.Item
      key={item.name}
      title={upperCaseFirst(item.name)}
      accessory={{ tooltip: gridItemTooltip, icon: Icon.QuestionMarkCircle }}
      content={{
        source: {
          light,
          dark,
        },
      }}
      actions={<CharacterActionPanel item={item} />}
    />
  );
});

export const ItemGrid = memo(() => {
  const columnNumber = useMemo(() => gridColumnNumber(), []);
  const { list, onSearchTextChange, loading } = useListContext();
  return (
    <Grid
      isLoading={loading}
      onSearchTextChange={onSearchTextChange}
      filtering={false}
      searchBarAccessory={<DataSetSelector />}
      columns={columnNumber}
    >
      {list.map((section) => (
        <Grid.Section
          key={`${section.sectionTitle}-${section.items.length}`}
          title={section.sectionTitle}
          aspectRatio={"1"}
          fit={Grid.Fit.Fill}
        >
          {section.items.map((item) => {
            const accessories = [];
            if (item.aliases?.length) {
              accessories.push({ icon: "⌨️", text: `${item.aliases.join(", ")}` });
            }
            return <GridItem item={item} key={`${item.code}-${item.name}`} />;
          })}
        </Grid.Section>
      ))}
    </Grid>
  );
});
