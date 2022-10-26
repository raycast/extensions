import { useEffect, useState } from "react";
import { ActionPanel, Action, Grid } from "@raycast/api";
import { useDebouncedEffect } from "./hooks/useDebouncedEffect";
import { PlayCoverApp } from "./PlayCover/interfaces";
import { usePlayCover, usePlayCoverSearch } from "./hooks/usePlayCover";
import os from "node:os";
import { showPlayCoverNotInstalledToast } from "./utils/utils";
const folder = `${os.homedir()}/Library/Containers/io.playcover.PlayCover`;

export default function Command() {
  const [itemSize, setItemSize] = useState<Grid.ItemSize>(Grid.ItemSize.Medium);
  const [isLoading, setIsLoading] = useState(true);
  const [firstRun, setFirstRun] = useState(false);
  const [searchText, setSearchText] = useState<string>("");
  const [games, setGames] = useState<PlayCoverApp[]>([]);
  
  useEffect(() => {
    showPlayCoverNotInstalledToast()
    setGames(usePlayCover());
  }, []);

  useDebouncedEffect(
    () => {
      setGames(usePlayCoverSearch(firstRun, searchText));
      setFirstRun(true);
      showPlayCoverNotInstalledToast()
    },
    [searchText],
    500
  );

  return (
    <Grid
      itemSize={itemSize}
      inset={Grid.Inset.Large}
      isLoading={isLoading}
      enableFiltering={false}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Applications..."
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Game installed with PlayCover!"
          storeValue
          onChange={(newValue) => {
            setItemSize(newValue as Grid.ItemSize);
            setIsLoading(false);
          }}
        >
          <Grid.Dropdown.Item title="Large" value={Grid.ItemSize.Large} />
          <Grid.Dropdown.Item title="Medium" value={Grid.ItemSize.Medium} />
          <Grid.Dropdown.Item title="Small" value={Grid.ItemSize.Small} />
        </Grid.Dropdown>
      }
    >
      {!isLoading &&
        games.map((game) => (
          <Grid.Item
            key={game.bundleId}
            content={game.icon}
            title={game.title}
            subtitle={`${game.bundleId}`}
            actions={
              <ActionPanel>
                <Action.Open
                  title={game.title}
                  target={`${folder}/${game.bundleId}`}
                  application={`${game.bundleId}`}
                />
              </ActionPanel>
            }
          />
        ))}
    </Grid>
  );
}
