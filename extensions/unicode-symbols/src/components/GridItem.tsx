import { memo } from "react";
import { Color, Grid, Icon } from "@raycast/api";
import { formatCharacterTooltip, useCharacterFormatting } from "@/lib/character-formatting";
import { useListContext } from "@/context/ListContext";
import { CharacterActionPanel } from "@/components/CharacterActionPanel";
import type { Character } from "@/types";

type Props = {
  item: Character;
  section?: string;
};

export const GridItem = memo(({ item, section }: Props) => {
  const { findHtmlEntity, filter } = useListContext();
  const html = findHtmlEntity(item.c);

  const formatting = useCharacterFormatting(item);
  const gridItemTooltip = formatCharacterTooltip(item, section, filter, html);

  return (
    <Grid.Item
      key={item.n}
      title={formatting.formattedName}
      accessory={{
        tooltip: gridItemTooltip,
        icon: {
          source: item.isExtra ? "exclamation-outline.svg" : Icon.Info,
          tintColor: Color.PrimaryText,
        },
      }}
      content={{
        source: {
          light: formatting.lightSvg,
          dark: formatting.darkSvg,
        },
      }}
      actions={<CharacterActionPanel item={item} section={section} />}
    />
  );
});
