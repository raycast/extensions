import { Action, Icon, showToast } from "@raycast/api";
import { StationData } from "../../types";
import { playStation } from "../../utils";

export default function PlayStationAction(props: {
  stationName: string;
  data: StationData;
  onStart?: () => void;
  onFinish?: () => void;
  onCompletion: (stationID: string) => void;
}) {
  const { stationName, data, onStart, onFinish, onCompletion } = props;

  return (
    <Action
      title={"Play Station"}
      icon={Icon.Play}
      onAction={async () => {
        onStart?.();
        await playStation(stationName, data.stream as string).then((stationID) => {
          if (stationID != -1) {
            onCompletion(stationID.toString());
            showToast({ title: "Playing Station", message: stationName });
            onFinish?.();
          }
        });
      }}
    />
  );
}
