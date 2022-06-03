import { List, Toast, showToast } from "@raycast/api";
import type { Player } from "../types/roster.types";
import useRoster from "../hooks/useRoster";
import { useState } from "react";
import PlayerComponent from "../components/Player";

type RosterArgs = {
  id: number;
};

const Roster = ({ id: id }: RosterArgs) => {
  let { roster, loading, error } = useRoster({ id: id });
  const [showingDetail, setIsShowingDetail] = useState<boolean>(false);

  if (error) {
    showToast(Toast.Style.Failure, "Failed to get roster");
    loading = false;
  }

  return (
    <List isLoading={loading} isShowingDetail={showingDetail}>
      {roster.map((player: Player) => {
        return <PlayerComponent key={player.id} player={player} setIsShowingDetail={setIsShowingDetail} />;
      })}
    </List>
  );
};

export default Roster;
