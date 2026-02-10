import { useState } from "react";
import { ActionPanel, Action, Grid } from "@raycast/api";
import type { Character, Dataset } from "@/types";
import { useCharacterFormatting } from "@/hooks/use-character-formatting";
import dataset from "../assets/dataset.json";

function GridItem({ item }: { item: Character }) {
  const formatting = useCharacterFormatting(item);
  return (
    <Grid.Item
      key={`${item.shape}-${item.name}`}
      content={{
        source: {
          light: formatting.lightSvg,
          dark: formatting.darkSvg,
        },
      }}
      title={item.name}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard content={item.shape} />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const [weight, setWeight] = useState("light");
  const [isLoading, setIsLoading] = useState(true);
  return (
    <Grid
      columns={8}
      inset={Grid.Inset.Large}
      isLoading={isLoading}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Weight"
          storeValue
          onChange={(newValue) => {
            setWeight(newValue);
            setIsLoading(false);
          }}
        >
          <Grid.Dropdown.Item title="Light" value={"light"} />
          <Grid.Dropdown.Item title="Heavy" value={"heavy"} />
          <Grid.Dropdown.Item title="Double" value={"double"} />
        </Grid.Dropdown>
      }
    >
      {!isLoading &&
        (dataset as Dataset)[weight].map((section) => (
          <Grid.Section key={section.title} title={section.title} aspectRatio="1" fit={Grid.Fit.Fill}>
            {section.items.map((item) => (
              <GridItem key={item.shape} item={item} />
            ))}
          </Grid.Section>
        ))}
    </Grid>
  );
}
