import { encode } from "js-base64";
import { memo } from "react";

import { Color, Grid, Icon } from "@raycast/api";

import { CharacterActionPanel } from "@/components/CharacterActionPanel";
import { useListContext } from "@/context/ListContext";
import type { Character } from "@/types";
import { getSquareSVGString, numberToHex, upperCaseFirst } from "@/utils/string";

type Props = {
  item: Character;
};

export const GridItem = memo(({ item }: Props) => {
  const { findHtmlEntity } = useListContext();
  const html = findHtmlEntity(item.c);

  const [light, dark] = [
    `data:image/svg+xml;base64,${encode(getSquareSVGString(item.v))}`,
    `data:image/svg+xml;base64,${encode(getSquareSVGString(item.v, true))}`,
  ];

  const gridItemTooltip: string = [
    `Name: ${upperCaseFirst(item.n)}`,
    `Dec: ${item.c}`,
    `Hex: ${numberToHex(item.c)}`,
    html ? `HTML Entity: ${html}` : "",
    item.a?.length ? `Aliases: "${item.a.map(upperCaseFirst).join(", ")}"` : "",
    ...(item.isExtra ? [" ", "> Note: This character is actually in a different Character Set"] : [""]),
  ]
    .filter((s) => s.length > 0)
    .join("\n");

  return (
    <Grid.Item
      key={item.n}
      title={upperCaseFirst(item.n)}
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
