import { encode } from "js-base64";
import { memo } from "react";

import { Color, Grid, Icon } from "@raycast/api";

import { CharacterActionPanel } from "@/components/CharacterActionPanel";
import type { Character } from "@/types";
import { getSquareSVGString, numberToHex, upperCaseFirst } from "@/utils/string";

type Props = {
  item: Character;
};

export const GridItem = memo(({ item }: Props) => {
  const [light, dark] = [
    `data:image/svg+xml;base64,${encode(getSquareSVGString(item.value))}`,
    `data:image/svg+xml;base64,${encode(getSquareSVGString(item.value, true))}`,
  ];

  const gridItemTooltip: string = [
    `Name: ${upperCaseFirst(item.name)}`,
    `Dec: ${item.code}`,
    `Hex: ${numberToHex(item.code)}`,
    item.aliases?.length ? `Aliases: "${item.aliases.map(upperCaseFirst).join(", ")}"` : "",
    ...(item.isExtra ? [" ", "> Note: This character is actually in a different Character Set"] : [""]),
  ]
    .filter((s) => s.length > 0)
    .join("\n");

  return (
    <Grid.Item
      key={item.name}
      title={upperCaseFirst(item.name)}
      accessory={{
        tooltip: gridItemTooltip,
        icon: {
          source: item.isExtra ? "exclamation-outline.svg" : Icon.QuestionMarkCircle,
          tintColor: Color.PrimaryText,
        },
      }}
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
