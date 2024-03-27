import { getAllPlayers } from "../api";
import { useEffect, useState } from "react";

interface Players {
  id: number;
  first_name: string;
  second_name: string;
  web_name: string;
  team: number;
  element_type: number;
  now_cost: number;
  news: string;
  news_added: string;
}

const usePlayers = () => {
  const [players, setPlayers] = useState<Players[] | null>(null);

  useEffect(() => {
    getAllPlayers().then((data) => setPlayers(data));
  }, []);

  return players;
};

export default usePlayers;
