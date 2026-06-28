import { useEffect, useState } from "react";
import { Grid, showToast, Toast } from "@raycast/api";
import { getErrorMessage } from "./utils/errors";
import { getPreferences } from "./utils/preferences";
import { MediaType, RawMediaItem, fetchItems, HelpError } from "./utils/jellyfinApi";
import { editToast } from "./utils/utils";
import MediaGridItem from "./components/MediaGridItem";
import ErrorDetailView from "./components/ErrorDetailView";

const preferences = getPreferences();

/**
 * A list of media types to be displayed in the grid and the dropdown.
 * The order in this list is also the order of the grid sections.
 */
const sections: MediaType[] = ["Movie", "Series"];

export default function Command({ parentId }: { parentId?: string }) {
  const [isLoading, setIsLoading] = useState(true);

  const [mediaTypes, setMediaTypes] = useState<MediaType[]>(sections);
  const [media, setMedia] = useState<RawMediaItem[]>([]);

  const [error, setError] = useState<string>("");

  useEffect(() => {
    (async () => {
      const toast = await showToast({
        title: "Jellyfin",
        message: "Fetching Media Items...",
        style: Toast.Style.Animated,
      });

      try {
        const newMedia = await fetchItems(sections, parentId ?? "");
        setMedia(newMedia);
        editToast(toast, `Loaded ${newMedia.length} Media Files`, Toast.Style.Success);
      } catch (e) {
        if (e instanceof HelpError) {
          setError(e.helpMessage);
        }
        editToast(toast, getErrorMessage(e), Toast.Style.Failure);
      }
    })().then(() => setIsLoading(false));
  }, []);

  return (
    <ErrorDetailView errorMessage={error}>
      <Grid
        columns={Math.min(Math.max(Number(preferences.columns), 1), 7)}
        isLoading={isLoading}
        inset={Grid.Inset.Zero}
        searchBarAccessory={
          <Grid.Dropdown
            tooltip="Filter Media Type"
            storeValue
            onChange={(newValue) => {
              setMediaTypes(newValue.split(", ").map((val) => val as MediaType));
            }}
          >
            <Grid.Dropdown.Item title="All" value={sections.join(", ")} />
            {sections.map((s) => (
              <Grid.Dropdown.Item key={s} title={s} value={s} />
            ))}
          </Grid.Dropdown>
        }
      >
        {sections
          .filter((s) => mediaTypes.includes(s))
          .map((s, sIndex) => (
            <Grid.Section key={s + "_" + sIndex} title={s} aspectRatio={"3/4"}>
              {media
                .filter((m) => m.Type == s)
                .map((m, mIndex) => (
                  <MediaGridItem key={s + "_" + mIndex} item={m} />
                ))}
            </Grid.Section>
          ))}

        <Grid.EmptyView title="No Media found on Jellyfin" />
      </Grid>
    </ErrorDetailView>
  );
}
