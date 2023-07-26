import fetch from "isomorphic-fetch";

import { TVSchedule } from "../domain/tvSchedule";
import { parseDate } from "../../../utils/dateUtils";
import { truncate } from "../../../utils/stringUtils";
import { ProgramResponse } from "./dto/programResponse";
import { ChannelResponse } from "./dto/channelResponse";

const TV_GUIDE_URL = "https://www.movistarplus.es/programacion-tv?v=json";
const ICON_URL = "https://www.movistarplus.es/recorte/m-NEO/canal";
const ICON_EXTENSION = ".png";

const getAll = async (): Promise<TVSchedule> => {
  return fetch(TV_GUIDE_URL, { headers: { Accept: "application/json" } })
    .then((response: { json: () => Promise<object> }) => response.json())
    .then((response: { data: object }) => Object.values(response.data))
    .then((channels: ChannelResponse[]) => channels.map(mapToChannel));
};

const mapToChannel = (channel: ChannelResponse) => {
  return {
    icon: `${ICON_URL}/${channel.DATOS_CADENA.CODIGO}${ICON_EXTENSION}`,
    name: channel.DATOS_CADENA.NOMBRE,
    schedule: channel.PROGRAMAS.map(mapToProgram),
  };
};

const mapToProgram = (program: ProgramResponse) => {
  const startTime = parseDate(program.HORA_INICIO);

  return {
    startTime,
    gender: program.GENERO,
    description: truncate(program.TITULO),
  };
};

export const tvScheduleRepository = { getAll };
