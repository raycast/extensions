import { Action, Alert, confirmAlert, Icon, showToast } from "@raycast/api";
import { StationListObject } from "../../types";
import { deleteStation, deleteTrack, getAllStations } from "../../utils";

export default function DeleteAllStationsAction(props: {
  stations: StationListObject;
  setStations: React.Dispatch<React.SetStateAction<StationListObject | undefined>>;
  onStart?: () => void;
  onFinish?: () => void;
}) {
  const { stations, setStations, onStart, onFinish } = props;
  return (
    <Action
      title={"Delete All Saved Stations"}
      style={Action.Style.Destructive}
      icon={Icon.XMarkCircle}
      onAction={async () => {
        if (
          await confirmAlert({
            title: "Delete All Saved Stations",
            message: "Are you sure?",
            primaryAction: {
              title: "Delete",
              style: Alert.ActionStyle.Destructive,
            },
          })
        ) {
          onStart?.();
          const numStations = Object.keys(stations).length;
          for (const stationName in stations) {
            await deleteTrack(undefined, `Raycast: ${stationName}`);
            await deleteStation(stationName, stations[stationName]);
          }
          setStations({});
          await showToast({ title: `Deleted ${numStations} Stations` });
          onFinish?.();
        }
      }}
      shortcut={{ modifiers: ["cmd"], key: "d" }}
    />
  );
}
