import { Action, Icon, useNavigation } from "@raycast/api";
import { StationData, StationListObject } from "../../types";
import { EditStationForm } from "../../utils";

export default function EditStationAction(props: {
  stationName: string;
  data: StationData;
  setStations: React.Dispatch<React.SetStateAction<StationListObject | undefined>>;
  onStart?: () => void;
  onFinish?: () => void;
}) {
  const { stationName, data, setStations, onStart, onFinish } = props;
  const { push } = useNavigation();
  return (
    <Action
      title={"Edit Station"}
      icon={Icon.Pencil}
      onAction={() => {
        onStart?.();
        push(<EditStationForm stationName={stationName} stationData={data} setStations={setStations} />);
        onFinish?.();
      }}
      shortcut={{ modifiers: ["cmd"], key: "e" }}
    />
  );
}
