import { Action, ActionPanel, getPreferenceValues, Grid, Image } from "@raycast/api";
import { useEffect, useState } from "react";

import { Media, MediaSearchArguments, SearchMediaPreferences, Vault } from "../utils/interfaces";
import { OpenPathInObsidianAction, ShowPathInFinderAction } from "../utils/actions";
import { getListOfExtensions, useMedia } from "../utils/utils";
import { IMAGE_SIZE_MAPPING } from "../utils/constants";

export function MediaGrid(props: { vault: Vault; searchArguments: MediaSearchArguments }) {
  const { vault, searchArguments } = props;

  const { ready, media } = useMedia(vault);
  const [mediaList, setMediaList] = useState<Media[]>([]);
  const [allMedia, setAllMedia] = useState<Media[]>([]);

  useEffect(() => {
    if (ready) {
      setMediaList(media);
      setAllMedia(media);
    }
  }, [ready]);

  const extensions = getListOfExtensions(allMedia);
  const { imageSize } = getPreferenceValues<SearchMediaPreferences>();

  return (
    <Grid
      inset={Grid.Inset.Small}
      itemSize={IMAGE_SIZE_MAPPING.get(imageSize)}
      isLoading={mediaList.length == 0 && !ready}
      searchText={searchArguments.searchArgument}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Filter by type"
          defaultValue={searchArguments.typeArgument}
          onChange={(value) => {
            if (value != "all") {
              setMediaList(allMedia.filter((media) => media.path.endsWith(value)));
            } else {
              setMediaList(allMedia);
            }
          }}
        >
          <Grid.Dropdown.Item title="All" value="all" />
          {extensions.map((extension) => (
            <Grid.Dropdown.Item title={extension} key={extension} value={extension} />
          ))}
        </Grid.Dropdown>
      }
    >
      {mediaList.map((m) => {
        return (
          <Grid.Item
            title={m.title}
            content={{ source: m.icon.source, mask: Image.Mask.RoundedRectangle }}
            key={m.path}
            quickLook={{ path: m.path, name: m.title }}
            actions={
              <ActionPanel>
                <Action.ToggleQuickLook />
                <OpenPathInObsidianAction path={m.path} />
                <ShowPathInFinderAction path={m.path} />
              </ActionPanel>
            }
          />
        );
      })}
    </Grid>
  );
}
