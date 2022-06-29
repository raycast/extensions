import getRoster from "../utils/getRoster";
import { useState, useEffect } from "react";
import type { Player, Injury } from "../types/roster.types";

const useRoster = ({ id: id }: { id: number }): { roster: Player[]; loading: boolean; error: boolean } => {
  const [roster, setRoster] = useState<Array<Player>>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    const fetchRoster = async () => {
      let data: any = null;

      try {
        data = await getRoster({ id: id });
      } catch (error) {
        setError(true);
        return error;
      }

      const athletes: Player[] = data.map(
        (athlete: any): Player => ({
          id: athlete.id,
          fullName: athlete.fullName,
          position: athlete.position.name,
          injuries: athlete.injuries.map(
            (injury: any): Injury => ({
              id: injury.id,
              status: injury.status,
              details: `${injury.details.side} ${injury.details.type} ${injury.details.detail}`,
            })
          ),
          headshot: athlete.headshot.href,
          weight: athlete.displayWeight,
          height: athlete.displayHeight,
          age: athlete.age,
          birthplace: `${athlete.birthPlace.city}, ${athlete.birthPlace.state}`,
          jerseyNumber: `#${athlete.jersey}`,
          salary: (() => {
            try {
              return `$${String(athlete.contract.salary).replace(/(.)(?=(\d{3})+$)/g, "$1,")}.00`;
            } catch (e) {
              return "Unavailable";
            }
          })(),
          draft: (() => {
            try {
              return athlete.draft.displayText;
            } catch (e) {
              return "Unavailable";
            }
          })(),
          link: athlete.links[0].href,
        })
      );

      setRoster(athletes);
      setLoading(false);
    };

    fetchRoster();
  }, []);

  return { roster, loading, error };
};

export default useRoster;
