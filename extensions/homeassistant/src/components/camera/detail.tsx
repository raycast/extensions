import { EntityStandardActionSections } from "@components/entity";
import { State } from "@lib/haapi";
import { ActionPanel, Detail, Toast, showToast } from "@raycast/api";
import React from "react";
import { CameraOpenStreamInBrowserAction, CameraOpenStreamInIINAAction, CameraOpenStreamInVLCAction } from "./actions";
import { useImage } from "./hooks";
import { getVideoStreamUrlFromCamera } from "./utils";

export function CameraImageDetail(props: { state: State }): React.ReactElement {
  const s = props.state;
  const { imageFilepath, isLoading, error } = useImage(s.entity_id);
  if (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Could not fetch image",
      message: error,
    });
  }
  let md = `# ${s.attributes.friendly_name || s.entity_id}`;
  const streamUrl = getVideoStreamUrlFromCamera(s);
  if (streamUrl) {
    md += `\n![Camera](${streamUrl})`;
  } else if (imageFilepath) {
    md += `\n![Camera](file://${encodeURI(imageFilepath)})`;
  }
  return (
    <Detail
      markdown={md}
      isLoading={isLoading}
      actions={
        <ActionPanel>
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
