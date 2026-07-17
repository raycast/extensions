import { ObsidianVault } from "@/obsidian";
import { Action, ActionPanel, getPreferenceValues, Grid, Image } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { filterMedia } from "../api/search/search.service";
import { OpenPathInObsidianAction, ShowPathInFinderAction, CopyPathAction } from "../utils/actions";
import { IMAGE_SIZE_MAPPING } from "../utils/constants";
import { useMedia } from "../utils/hooks";
import { Media, MediaSearchArguments } from "../utils/interfaces";
import { SearchMediaPreferences } from "../utils/preferences";
import { getIconFor, getListOfMediaFileExtensions } from "../utils/utils";

export function MediaGrid(props: { vault: ObsidianVault; searchArguments: MediaSearchArguments }) {
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

  const extensions = getListOfMediaFileExtensions(allMedia);
  const { imageSize } = getPreferenceValues<SearchMediaPreferences>();

  const [searchText, setSearchText] = useState(searchArguments.searchArgument);
  let mediaType = searchArguments.typeArgument;
  if (!mediaType) mediaType = "all";
  else if (!mediaType.startsWith(".")) {
    mediaType = `.${mediaType}`;
  }
  const list = useMemo(() => filterMedia(mediaList, searchText), [mediaList, searchText]);

  return (
    <Grid
      fit={Grid.Fit.Fill}
      columns={IMAGE_SIZE_MAPPING.get(imageSize)}
      isLoading={mediaList.length == 0 && !ready}
      aspectRatio={"4/3"}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Filter by type"
          defaultValue={mediaType}
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
      {list.map((m) => {
        const icon = getIconFor(m.path);
        return (
          <Grid.Item
            title={m.title}
            content={{ source: icon.source, mask: Image.Mask.RoundedRectangle }}
            key={m.path}
            quickLook={{ path: m.path, name: m.title }}
            actions={
              <ActionPanel>
                <Action.ToggleQuickLook />
                <OpenPathInObsidianAction path={m.path} />
                <ShowPathInFinderAction path={m.path} />
                <CopyPathAction path={m.path} />
              </ActionPanel>
            }
          />
        );
      })}
    </Grid>
  );
}
