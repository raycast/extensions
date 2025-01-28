import { useFetch } from "@raycast/utils";
import { API_KEY } from "../config";
import { ProgramShort } from "../types";

type GetProgramsResponse = {
  statusCode: number;
  body?: ProgramShort[];
};

export const usePrograms = () => {
  return useFetch<GetProgramsResponse>("https://api.jwstapi.com/program/list", {
    headers: { "X-API-KEY": API_KEY },
  });
};
