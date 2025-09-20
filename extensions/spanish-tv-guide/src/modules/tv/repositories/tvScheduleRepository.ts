import fetch from "isomorphic-fetch";

import { ProgramDto, ProgramDetailsDto, TvScheduleDto } from "../domain/tvScheduleDto";
import { dateReviver } from "../../../utils/dateUtils";

const TV_GUIDE_CHANNELS_URL = "https://spanish-tv-guide-api.vercel.app/api/guide/channels";
const TV_GUIDE_PROGRAM_DETAILS_URL = "https://spanish-tv-guide-api.vercel.app/api/guide/program";

const getAll = async (): Promise<TvScheduleDto> => {
  return fetch(TV_GUIDE_CHANNELS_URL)
    .then((response) => response.json())
    .then((response) => JSON.parse(JSON.stringify(response), dateReviver));
};

const getProgramDetails = async (program: ProgramDto): Promise<ProgramDetailsDto> => {
  const url = buildGetProgramDetailsUrl(TV_GUIDE_PROGRAM_DETAILS_URL, program.url);

  return fetch(url)
    .then((response) => response.json())
    .then((response) => JSON.parse(JSON.stringify(response), dateReviver));
};

const buildGetProgramDetailsUrl = (baseUrl: string, url: string) => {
  const encodedProgramUrl = encodeURI(url);

  return `${baseUrl}?${toQueryString("url", encodedProgramUrl)}`;
};

const toQueryString = (key: string, value: string) => {
  const params = new URLSearchParams();
  params.append(key, value);

  return params.toString();
};

export const tvScheduleRepository = { getAll, getProgramDetails };
