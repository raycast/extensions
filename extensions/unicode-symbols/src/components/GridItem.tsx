import { memo } from "react";
import { Color, Grid, Icon } from "@raycast/api";
import type { Character } from "@/types";
import { useListContext } from "@/context/ListContext";
import { useCharacterFormatting } from "@/hooks/use-character-formatting";
import { useFormatCharacterTooltip } from "@/hooks/use-format-character-tooltip";
import { CharacterActionPanel } from "@/components/CharacterActionPanel";

type Props = {
  item: Character;
  section?: string;
};

export const GridItem = memo(({ item, section }: Props) => {
  const { findHtmlEntity, filter } = useListContext();
  const html = findHtmlEntity(item.c);

  const formatting = useCharacterFormatting(item);
  const gridItemTooltip = useFormatCharacterTooltip(item, section, filter, html);

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
