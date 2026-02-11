import { EntityStandardActionSections } from "@components/entity";
import { useHAStates } from "@components/hooks";
import { useStateSearch } from "@components/state/hooks";
import { State } from "@lib/haapi";
import { getFriendlyName } from "@lib/utils";
import { Action, ActionPanel, Color, Grid, Image, List, Toast, getPreferenceValues, showToast } from "@raycast/api";
import React from "react";
import {
  CameraOpenStreamInBrowserAction,
  CameraOpenStreamInIINAAction,
  CameraOpenStreamInVLCAction,
  CameraShowImageAction,
} from "./actions";
import { useImage } from "./hooks";

const defaultRefreshInterval = 3000;

export function getCameraRefreshInterval(): number | null {
  const preferences = getPreferenceValues();
  const userValue = preferences.camerarefreshinterval as string;
  if (!userValue || userValue.length <= 0) {
    return defaultRefreshInterval;
  }
  const msec = parseFloat(userValue);
  if (Number.isNaN(msec)) {
    console.log(`invalid value ${userValue}, fallback to null`);
    return null;
  }
  if (msec < 1) {
    return null;
  } else {
    return msec;
  }
}

function CameraGridItem(props: { state: State }): React.ReactElement {
  const s = props.state;
  const { localFilepath, imageFilepath } = useImage(s.entity_id);
  const content: Image.ImageLike =
    s.state === "unavailable" ? { source: "video.svg", tintColor: Color.Blue } : { source: localFilepath || "" };
  const titleParts = [getFriendlyName(s)];
  if (s.state === "unavailable") {
    titleParts.push("❌");
  }
  const motionIcon = (): Image.ImageLike | undefined => {
    const motion = s.attributes.motion_detection;
    if (motion === undefined) {
      return;
    }
    return motion === true
      ? { source: "run.svg", tintColor: Color.Yellow }
      : { source: "walk.svg", tintColor: Color.PrimaryText };
  };
  return (
    <Grid.Item
      content={content}
      title={titleParts.join(" ")}
      quickLook={imageFilepath ? { name: getFriendlyName(s), path: imageFilepath } : undefined}
      accessory={{ icon: motionIcon() }}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Controls">
            <CameraShowImageAction state={s} />
            {imageFilepath && <Action.ToggleQuickLook />}
          </ActionPanel.Section>
          <ActionPanel.Section title="Video Stream">
            <CameraOpenStreamInBrowserAction state={s} />
            <CameraOpenStreamInVLCAction state={s} />
            <CameraOpenStreamInIINAAction state={s} />
          </ActionPanel.Section>
          <EntityStandardActionSections state={s} />
        </ActionPanel>
      }
    />
  );
}

export function CameraGrid(): React.ReactElement {
  const { states: allStates, error, isLoading } = useHAStates();
  const { states } = useStateSearch(undefined, "camera", "", allStates);

  if (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Cannot get Home Assistant Cameras",
      message: error.message,
    });
  }

  if (!states) {
    return <List isLoading={true} searchBarPlaceholder="Loading" />;
  }

  return (
    <Grid
      searchBarPlaceholder="Filter by Name"
      inset={Grid.Inset.Zero}
      isLoading={isLoading}
      columns={3}
      fit={Grid.Fit.Fill}
    >
      {states?.map((s) => (
        <CameraGridItem key={s.entity_id} state={s} />
      ))}
    </Grid>
  );
}
