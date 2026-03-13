import { Action, Alert, confirmAlert, Icon } from "@raycast/api";
import { StationData, StationListObject } from "../../types";
import { deleteStation, getAllStations } from "../../utils";

export default function DeleteStationAction(props: {
  stationName: string;
  data: StationData;
  setStations: React.Dispatch<React.SetStateAction<StationListObject | undefined>>;
  onStart?: () => void;
  onFinish?: () => void;
}) {
  const { stationName, data, setStations, onStart, onFinish } = props;
  return (
    <Action
      title={"Delete Station"}
      style={Action.Style.Destructive}
      icon={Icon.Trash}
      onAction={async () => {
        onStart?.();
        if (
          await confirmAlert({
            title: "Are you sure?",
            primaryAction: {
              title: "Delete",
              style: Alert.ActionStyle.Destructive,
            },
          })
        ) {
          await deleteStation(stationName, data);
          const stationList = await getAllStations();
          setStations(stationList);
        }
        onFinish?.();
      }}
      shortcut={{ modifiers: ["cmd"], key: "d" }}
    />
  );
}
