import { List } from "@raycast/api";
import useRoster from "../hooks/useRoster";
import { useState } from "react";
import PlayerComponent from "../components/Player";

type RosterArgs = {
  id: number;
};

const Roster = ({ id: id }: RosterArgs) => {
  const { data, isLoading } = useRoster({ id: id });
  const [isShowingDetail, setIsShowingDetail] = useState<boolean>(true);

  return (
    <List isLoading={isLoading} isShowingDetail={isShowingDetail}>
      {data?.map((player) => {
        return (
          <PlayerComponent
            key={player.id}
            player={player}
            setIsShowingDetail={setIsShowingDetail}
            isShowingDetail={isShowingDetail}
          />
        );
      })}
    </List>
  );
};

export default Roster;
