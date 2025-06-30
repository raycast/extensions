import { Action, Icon, LocalStorage, showToast } from "@raycast/api";
import { StationData, StationListObject } from "../../types";
import { dummyStation, getAllStations, modifyStation } from "../../utils";

export default function SaveStationAction(props: {
  stationName: string;
  data: StationData;
  setSavedStations: React.Dispatch<React.SetStateAction<StationListObject>>;
  onStart?: () => void;
  onFinish?: () => void;
}) {
  const { stationName, data, setSavedStations, onStart, onFinish } = props;
  return (
    <Action
      title="Save Station"
      icon={Icon.Download}
      onAction={async () => {
        onStart?.();
        const currentTempInfo = await LocalStorage.getItem("-temp-station-info");
        if (currentTempInfo != undefined && Object.keys(JSON.parse(currentTempInfo as string))[0] == stationName) {
          await LocalStorage.removeItem("-temp-station-info");
        }

        await modifyStation("", stationName, dummyStation, data, () => null);
        await showToast({ title: "Saved Station", message: stationName });

        const updatedSavedStations = await getAllStations();
        setSavedStations(updatedSavedStations);
        onFinish?.();
      }}
    />
  );
}
