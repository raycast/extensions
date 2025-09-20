import { List } from "@raycast/api";
import useRoster from "../hooks/useRoster";
import { useState } from "react";
import PlayerComponent from "../components/Player";

type RosterArgs = {
  id: number;
  league: string;
};

const Roster = ({ id, league }: RosterArgs) => {
  const { data, isLoading } = useRoster({ id, league });
  const [isShowingDetail, setIsShowingDetail] = useState<boolean>(true);

  return (
    <List isLoading={isLoading} isShowingDetail={isShowingDetail}>
      {data?.map((player) => (
        <PlayerComponent
          key={player.id}
          player={player}
          setIsShowingDetail={setIsShowingDetail}
          isShowingDetail={isShowingDetail}
        />
      ))}
    </List>
  );
};

export default Roster;
