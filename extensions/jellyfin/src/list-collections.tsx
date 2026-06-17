import { useEffect, useState } from "react";
import { Grid, showToast, Toast, useNavigation } from "@raycast/api";
import { getErrorMessage } from "./utils/errors";
import { getPreferences } from "./utils/preferences";
import { RawMediaItem, fetchItems, HelpError } from "./utils/jellyfinApi";
import { editToast } from "./utils/utils";
import MediaGridItem from "./components/MediaGridItem";
import ErrorDetailView from "./components/ErrorDetailView";

const preferences = getPreferences();

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [media, setMedia] = useState<RawMediaItem[]>([]);
  const [error, setError] = useState<string>("");

  const { push: pushNavigation } = useNavigation();

  useEffect(() => {
    (async () => {
      const toast = await showToast({
        title: "Jellyfin",
        message: "Fetching Media Items...",
        style: Toast.Style.Animated,
      });

      try {
        const newMedia = await fetchItems(["BoxSet"]);
        setMedia(newMedia);
        editToast(toast, `Loaded ${newMedia.length} Collections`, Toast.Style.Success);
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
      >
        {media.map((m, mIndex) => (
          <MediaGridItem key={mIndex} item={m} pushNavigation={pushNavigation} />
        ))}
        <Grid.EmptyView title="No Media found on Jellyfin" />
      </Grid>
    </ErrorDetailView>
  );
}
