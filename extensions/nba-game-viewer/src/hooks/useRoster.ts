import { useCachedPromise } from "@raycast/utils";
import getRoster from "../utils/getRoster";
import type { Player, Injury } from "../types/roster.types";

const fetchRoster = async (teamId: number, league: string) => {
  const rosterData = await getRoster({ league, id: teamId });
  const athletes: Player[] = rosterData.map(
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
        }),
      ),
      headshot: athlete.headshot?.href,
      weight: athlete.displayWeight,
      height: athlete.displayHeight,
      age: athlete.age,
      birthplace: `${athlete.birthPlace.city}, ${athlete.birthPlace.state}`,
      jerseyNumber: `#${athlete.jersey}`,
      salary: athlete.contract?.salary
        ? `$${String(athlete.contract.salary).replace(/(.)(?=(\d{3})+$)/g, "$1,")}.00`
        : "Unavailable",
      draft: athlete.draft?.displayText || "Unavailable",
      link: athlete.links[0]?.href || "",
    }),
  );
  return athletes;
};

const useRoster = ({ id, league }: { id: number; league: string }) =>
  useCachedPromise(fetchRoster, [id, league], { failureToastOptions: { title: "Could not fetch roster" } });

export default useRoster;
