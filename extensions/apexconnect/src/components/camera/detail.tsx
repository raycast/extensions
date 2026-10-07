import { showFailureToast } from "@raycast/utils";
import { EntityStandardActionSections } from "@components/entity";
import { State } from "@lib/apexapi";
import { ActionPanel, Detail } from "@raycast/api";
import { CameraOpenStreamInBrowserAction, CameraOpenStreamInIINAAction, CameraOpenStreamInVLCAction } from "./actions";
import { useImage } from "./hooks";

export function CameraImageDetail(props: { state: State }): JSX.Element {
  const s = props.state;
  const { imageFilepath, isLoading, error } = useImage(s);
  if (error) {
    showFailureToast(error, { title: "Could not fetch image" });
  }
  let md = `# ${s.attributes.friendly_name || s.entity_id}`;
  if (imageFilepath) {
    // Wrapped in <> per CommonMark's "pointy bracket" link form, since
    // Raycast's cache directory path contains a space ("Application Support").
    md += `\n![Camera](<${imageFilepath}>)`;
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
