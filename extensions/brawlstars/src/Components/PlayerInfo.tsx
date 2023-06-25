import { useEffect, useState } from "react";
import { searchPlayer } from "../Utils/playerUtils";
import { Action, ActionPanel, Detail, Icon, List } from "@raycast/api";
import ClubComponent from "./clubInfo";
import { IPlayerData, emptyPlayerData } from "../models/IPlayerData";
import Error403 from "./BadAPIKey";
import Error404 from "./NotFoundError";
import Player from "./PlayerComponent";

interface IPlayerIdProps {
  id: string;
}

const PlayerComponent = ({ id }: IPlayerIdProps) => {
  const [playerData, setPlayerData] = useState<IPlayerData>();

  const [error, setError] = useState<any>();

  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    const fetchPlayerData = async () => {
      try {
        const data = await searchPlayer(id);
        setPlayerData(data);
      } catch (error) {
        setError(error);
      }
    };

    fetchPlayerData();
  }, []);
  if (error) {
    if (typeof error === "string") {
      if (error.includes("403")) {
        return <Error403 error={error} />;
      } else if (error.includes("404")) {
        return (
          <List onSearchTextChange={setSearchText}>
            <Error404 searchText={searchText} />
          </List>
        );
      }
    }
  }
  if (!playerData) {
    return (
      <List onSearchTextChange={setSearchText}>
        <List.EmptyView icon={Icon.CircleProgress} title="Loading Player Data" description="Work in progress." />
      </List>
    );
  }

  return <Player playerData={playerData} />;
};

export default PlayerComponent;
