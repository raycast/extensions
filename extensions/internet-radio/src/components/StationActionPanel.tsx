import { ActionPanel, LocalStorage } from "@raycast/api";
import { StationData, StationListObject } from "../types";
import DeleteAllStationsAction from "./actions/DeleteAllStationsAction";
import DeleteStationAction from "./actions/DeleteStationAction";
import EditStationAction from "./actions/EditStationAction";
import PlayStationAction from "./actions/PlayStationAction";
import SaveStationAction from "./actions/SaveStationAction";
import StationDetailsAction from "./actions/StationDetailsAction";
import StopPlaybackAction from "./actions/StopPlaybackAction";
import UrlActionSection from "./actions/UrlActionSection";

export default function StationActionPanel(props: {
  stationName: string;
  currentStationName: string;
  currentTrackID: string;
  data: StationData;
  isPlaying: boolean;
  stations: StationListObject;
  setStations: React.Dispatch<React.SetStateAction<StationListObject | undefined>>;
  setSavedStations?: undefined | React.Dispatch<React.SetStateAction<StationListObject>>;
  onActionStart?: () => void;
  onActionFinish?: () => void;
  onPlay: (stationID: string) => void;
  onStop: () => void;
  allowModification?: boolean;
  showDetails: boolean;
  setShowDetails: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const {
    stationName,
    currentStationName,
    currentTrackID,
    data,
    isPlaying,
    stations,
    setStations,
    setSavedStations,
    onActionStart,
    onActionFinish,
    onPlay,
    onStop,
    allowModification,
    showDetails,
    setShowDetails,
  } = props;
  return (
    <ActionPanel>
      <ActionPanel.Section>
        {!isPlaying || currentStationName != stationName ? (
          <PlayStationAction
            stationName={stationName}
            data={data}
            onStart={onActionStart}
            onFinish={onActionFinish}
            onCompletion={(stationID: string | number) => {
              if (stationID != -1) {
                onPlay(stationID as string);
              }
            }}
          />
        ) : null}

        {isPlaying && currentStationName == stationName ? (
          <StopPlaybackAction
            stationName={currentStationName}
            trackID={currentTrackID}
            onStart={onActionStart}
            onFinish={onActionFinish}
            onCompletion={() => onStop()}
          />
        ) : null}

        {allowModification == false && setSavedStations != undefined ? (
          <SaveStationAction
            stationName={stationName}
            data={data}
            setSavedStations={setSavedStations}
            onStart={onActionStart}
            onFinish={onActionFinish}
          />
        ) : null}

        {allowModification != false ? (
          <StationDetailsAction showDetails={showDetails} setShowDetails={setShowDetails} />
        ) : null}
      </ActionPanel.Section>

      <UrlActionSection data={data} />

      {allowModification != false ? (
        <ActionPanel.Section>
          <EditStationAction
            stationName={stationName}
            data={data}
            setStations={setStations}
            onStart={onActionStart}
            onFinish={onActionFinish}
          />
          <DeleteStationAction
            stationName={stationName}
            data={data}
            setStations={setStations}
            onStart={onActionStart}
            onFinish={onActionFinish}
          />
          <DeleteAllStationsAction
            stations={stations}
            setStations={setStations}
            onStart={onActionStart}
            onFinish={onActionFinish}
          />
        </ActionPanel.Section>
      ) : null}
    </ActionPanel>
  );
}
