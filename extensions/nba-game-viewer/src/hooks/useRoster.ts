import getRoster from "../utils/getRoster";
import { useCallback } from "react";
import type { Player, Injury } from "../types/roster.types";
import { useCachedPromise } from "@raycast/utils";

const useRoster = ({ id: id }: { id: number }) => {
  const fetchRoster = useCallback(async (id: number) => {
    const data = await getRoster({ id: id });

    const athletes: Player[] = data.map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (athlete: any): Player => ({
        id: athlete.id,
        fullName: athlete.fullName,
        position: athlete.position.name,
        injuries: athlete.injuries.map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (injury: any): Injury => ({
            id: injury.id,
            status: injury.status,
            details: `${injury.details.side} ${injury.details.type} ${injury.details.detail}`,
          })
        ),
        headshot: athlete.headshot?.href,
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

    return athletes;
  }, []);

  return useCachedPromise(fetchRoster, [id]);
};

export default useRoster;
