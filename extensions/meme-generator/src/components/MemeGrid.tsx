import { useEffect, useState } from "react";
import { ActionPanel, Action, Grid, Icon } from "@raycast/api";
import { getMemes } from "../api";
import { Meme } from "../types";
import MemeForm from "./MemeForm";
import MemePreview from "./MemePreview";

export default function MemeGrid() {
  const [itemSize, setItemSize] = useState<Grid.ItemSize>(Grid.ItemSize.Medium);
  const [isLoading, setIsLoading] = useState(true);
  const [allMemes, setAllMemes] = useState<Meme[]>();

  useEffect(() => {
    getMemes()
      .then((result) => {
        setAllMemes(result.memes);
      })
      .catch((error) => {
        console.error(error.message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  return (
    <Grid
      itemSize={itemSize}
      isLoading={isLoading}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Grid Item Size"
          storeValue
          onChange={(newValue) => {
            setItemSize(newValue as Grid.ItemSize);
          }}
        >
          <Grid.Dropdown.Item title="Large" value={Grid.ItemSize.Large} />
          <Grid.Dropdown.Item title="Medium" value={Grid.ItemSize.Medium} />
          <Grid.Dropdown.Item title="Small" value={Grid.ItemSize.Small} />
        </Grid.Dropdown>
      }
    >
      {!isLoading &&
        allMemes?.map((meme) => (
          <Grid.Item
            key={meme.id}
            content={meme.url}
            title={meme.title}
            actions={
              <ActionPanel>
                <Action.Push icon={Icon.CheckCircle} title="Select template" target={<MemeForm {...meme} />} />
                <Action.Push icon={Icon.Eye} title="Preview template" target={<MemePreview {...meme} />} />
              </ActionPanel>
            }
          />
        ))}
    </Grid>
  );
}
