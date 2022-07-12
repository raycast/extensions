import { useEffect, useState } from "react";
import { getClubs, getPerson, getPersons } from "../api";
import { CompetitionClub, Player, Players } from "../types";

export const useClubs = () => {
  const [clubs, setClubs] = useState<CompetitionClub>();

  useEffect(() => {
    getClubs().then((data) => {
      setClubs(data);
    });
  }, []);

  return clubs;
};

export const usePersons = (club: string) => {
  const [players, setPlayers] = useState<Players>();

  useEffect(() => {
    getPersons(club).then((data) => {
      setPlayers(data);
    });
  }, [club]);

  return players;
};

export const usePerson = (slug: string) => {
  const [player, setPlayer] = useState<Player>();

  useEffect(() => {
    getPerson(slug).then((data) => {
      setPlayer(data);
    });
  }, [slug]);

  return player;
};
