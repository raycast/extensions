import { useSportMonksClient } from "@src/hooks";
import { Team } from "@src/types";
import { formatSelectFields } from "@src/utils";

const MAX_RESULTS_PER_PAGE = 10;

type SelectFields = {
  image_path?: boolean;
};

type SportMonksPlayerField = {
  jersey_number: number;
  player: {
    id: string;
    date_of_birth: string;
    display_name: string;
    image_path: string;
    position: {
      name?: string;
    };
    country: {
      name: string;
      image_path: string;
    };
  };
};

type SportMonksTeamResponse = {
  id: string;
  name: string;
  image_path: string;
  players: SportMonksPlayerField[];
};

const useFetchTeams = (name: string, selectFields: SelectFields) => {
  const selectedFields = formatSelectFields(selectFields);
  const { data, isLoading, revalidate } = useSportMonksClient({
    method: "get",
    path: `/teams/search/${name}?per_page=${MAX_RESULTS_PER_PAGE}&select=name,${selectedFields}&include=players.player.position;players.player.country`,
    execute: name.length !== 0,
  });
  const response: SportMonksTeamResponse[] = data?.data;
  const teams: Team[] =
    response?.map((team) => {
      return {
        id: team.id,
        name: team.name,
        image_path: team.image_path,
        players: team.players.map(({ player, ...rest }) => {
          return {
            id: player.id,
            jersey_number: rest.jersey_number,
            name: player.display_name,
            date_of_birth: player.date_of_birth,
            image_path: player.image_path,
            position: player.position?.name,
            country: {
              name: player.country.name,
              image_path: player.country.image_path,
            },
          };
        }),
      };
    }) ?? [];
  return { data: teams, isLoading, revalidate };
};

export default useFetchTeams;
