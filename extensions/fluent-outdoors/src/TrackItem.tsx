import { ActionPanel, List, Action, Icon, Color, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { getFavouriteTracksStorage } from "./Storage";
import { TrackDetails } from "./TrackDetails";
import { OnFavouriteTracksUpdateAction, Track } from "./types/common";
import { getTrackCondition } from "./utils";

export function TrackItem({
  track,
  isFavourite = false,
  onFavouriteTracksUpdate,
}: {
  track: Track;
  icon?: Icon;
  color?: Color;
  isFavourite?: boolean;
  onFavouriteTracksUpdate: OnFavouriteTracksUpdateAction;
}) {
  const [favourite, setFavourite] = useState(isFavourite);
  const storage = getFavouriteTracksStorage();
  let trackIcon = Icon.Snowflake;
  let trackColor = Color.PrimaryText;
  let trackActionText = "Mark as Favourite";
  let trackActionIcon = Icon.Star;

  // Add to favourites
  let trackAction = async () => {
    setFavourite(true);
    onFavouriteTracksUpdate(await storage.addEntry(track));
    showToast({
      style: Toast.Style.Success,
      title: "Updated favourites",
    });
  };

  // Favourite
  if (favourite) {
    trackActionText = "Remove from favourites";
    trackActionIcon = Icon.StarDisabled;
    // Remove from favourites
    trackAction = async () => {
      setFavourite(false);
      onFavouriteTracksUpdate(await storage.removeEntry(track.id));
      showToast({
        style: Toast.Style.Success,
        title: "Updated favourites",
      });
    };
    trackIcon = Icon.Star;
    trackColor = Color.Yellow;
  }

  const condition = getTrackCondition({ track });

  return (
    <List.Item
      icon={{ source: trackIcon, tintColor: trackColor }}
      title={track.name}
      subtitle={track.service.name}
      actions={
        <ActionPanel>
          <Action.Push title="Show Details" icon={Icon.MagnifyingGlass} target={<TrackDetails track={track} />} />
          <Action
            title={trackActionText}
            icon={trackActionIcon}
            onAction={trackAction}
            shortcut={{ modifiers: ["cmd"], key: "f" }}
          />
        </ActionPanel>
      }
      accessories={[
        { text: condition.text },
        {
          icon: { source: condition.icon, tintColor: condition.color },
        },
      ]}
    />
  );
}
