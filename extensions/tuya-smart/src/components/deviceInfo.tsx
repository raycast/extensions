import { Detail, useNavigation } from "@raycast/api";
import { Device } from "../utils/interfaces";
import { DeviceActionPanel } from "./actionPanels";

function millisToMinutesAndSeconds(millis: number) {
  const minutes = Math.floor(millis / 60000);
  const seconds = ((millis % 60000) / 1000).toFixed(0);
  return minutes + ":" + (+seconds < 10 ? "0" : "") + seconds;
}

export function DeviceInfo(props: { device: Device; onAction: (result: boolean) => void }): JSX.Element {
  const { pop } = useNavigation();
  return (
    <Detail
      markdown={"## Device"}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Active Time" text={millisToMinutesAndSeconds(props.device.active_time)} />
          <Detail.Metadata.Label title="Update Time" text={millisToMinutesAndSeconds(props.device.update_time)} />
        </Detail.Metadata>
      }
      actions={
        <DeviceActionPanel
          device={props.device}
          showDetails={false}
          onAction={(result) => {
            pop();
            props.onAction(result);
          }}
        />
      }
    />
  );
}
