import { useEffect, useState } from "react";
import { getClubs, getPerson, getPersons } from "../api";
import { CompetitionClub, Player, Players } from "../types";

export const useClubs = () => {
  const [clubs, setClubs] = useState<CompetitionClub>({});
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    setLoading(true);
    getClubs().then((data) => {
      setClubs(data);
      setLoading(false);
    });
  }, []);

  return { clubs, loading };
};

export const usePersons = (club: string) => {
  const [players, setPlayers] = useState<Players>({});
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    setLoading(true);
    getPersons(club).then((data) => {
      setPlayers(data);
      setLoading(false);
    });
  }, [club]);

  return { players, loading };
};

export const usePerson = (slug: string) => {
  const [player, setPlayer] = useState<Player | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    setLoading(true);
    getPerson(slug).then((data) => {
      setPlayer(data);
      setLoading(false);
    });
  }, [slug]);

  return { player, loading };
};
