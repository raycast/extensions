import { useFetch } from "@raycast/utils";
import { Observation } from "../types";
import { API_KEY } from "../config";

type GetProgramObservationsResponse = {
  statusCode: number;
  body?: Observation[];
};
type GetProgramObservationsArgs = {
  programId: number;
};

export const useProgramObservations = (args: GetProgramObservationsArgs) => {
  const { programId } = args;
  const perPage = 20;

  return useFetch<GetProgramObservationsResponse, Observation[], Observation[]>(
    (options) => {
      const params = new URLSearchParams({
        page: String(options.page + 1),
        perPage: String(perPage + 1),
      });

      return `https://api.jwstapi.com/program/id/${programId}?${params}`;
    },
    {
      headers: { "X-API-KEY": API_KEY },
      mapResult: (result) => {
        const observations = result?.body ?? [];
        return {
          data: observations.slice(0, perPage),
          hasMore: observations.length > perPage,
        };
      },
      initialData: [] as Observation[],
      keepPreviousData: true,
    },
  );
};
