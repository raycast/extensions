import { Activity } from "../type";
import { Action, ActionPanel, Color, environment, getPreferenceValues, Icon, List } from "@raycast/api";
import { useCallback } from "react";
import { StatMetadata } from "./StatMetadata";
import { sportsIcons } from "../util/const";

export default function Stat({ activity }: { activity: Activity }) {
  const preferences = getPreferenceValues<Preferences>();
  const indexPreference = getPreferenceValues<Preferences.Index>();

  const mapboxImg = useCallback(
    (summary_polyline: string) => {
      // https://docs.mapbox.com/api/maps/styles/
      const mode = environment.appearance === "light" ? indexPreference["light-style"] : indexPreference["dark-style"];
      // rgb(224,237,94)';
      const strokeColor = indexPreference["stroke-color"] || "e0ed5e";
      // https://docs.mapbox.com/api/maps/static-images/#path
      const path = `path-5+${strokeColor}-0.5(${encodeURIComponent(summary_polyline)})`;
      const width = encodeURIComponent(860);
      const height = encodeURIComponent(360);
      const padding = encodeURIComponent("40,40,80");

      return `https://api.mapbox.com/styles/v1/mapbox/${mode}/static/${path}/auto/${width}x${height}?padding=${padding}&access_token=${preferences.mapbox_access_token}`;
    },
    [preferences.mapbox_access_token],
  );

  const date = new Date(activity.start_date_local).toLocaleDateString("en-US", { month: "long", day: "numeric" });

  return (
    <List.Item
      actions={
        <ActionPanel>
          <Action.CopyToClipboard content={`${JSON.stringify(activity)}`} icon={Icon.Clipboard} />
        </ActionPanel>
      }
      keywords={[activity.start_date_local.split(" ")[0]]}
      title={activity.type}
      accessories={[{ text: date }]}
      icon={{ source: sportsIcons[activity.type] || sportsIcons.Workout, tintColor: Color.PrimaryText }}
      detail={
        <List.Item.Detail
          markdown={preferences.mapbox_access_token ? `![](${mapboxImg(activity.summary_polyline)})` : ""}
          metadata={<StatMetadata activity={activity} />}
        />
      }
    />
  );
}
