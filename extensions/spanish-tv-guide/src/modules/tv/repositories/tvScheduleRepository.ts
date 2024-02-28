import fetch from "isomorphic-fetch";

import { ChannelSchedule, Program, TVSchedule } from "../domain/tvSchedule";
import { now, parseTime, plusOneDay } from "../../../utils/dateUtils";
import { truncate } from "../../../utils/stringUtils";
import { ProgramResponse } from "./dto/programResponse";
import { ChannelResponse } from "./dto/channelResponse";
import { findLast, last, replace } from "../../../utils/collectionUtils";

const TV_GUIDE_URL = "https://www.movistarplus.es/programacion-tv?v=json";
const ICON_URL = "https://www.movistarplus.es/recorte/m-NEO/canal";
const ICON_EXTENSION = "png";

const getAll = async (): Promise<TVSchedule> => {
  return fetch(TV_GUIDE_URL, { headers: { Accept: "application/json" } })
    .then((response: { json: () => Promise<object> }) => response.json())
    .then((response: { data: object }) => Object.values(response.data))
    .then((channels: ChannelResponse[]) => channels.map(mapToChannel))
    .then((channelSchedules: ChannelSchedule[]) => channelSchedules.map(channelScheduleWithLiveProgram));
};

const mapToChannel = (channel: ChannelResponse): ChannelSchedule => {
  return {
    icon: `${ICON_URL}/${channel.DATOS_CADENA.CODIGO}.${ICON_EXTENSION}`,
    name: channel.DATOS_CADENA.NOMBRE,
    schedule: mapToSchedule(channel.PROGRAMAS),
  };
};

const mapToSchedule = (programs: ProgramResponse[]) => {
  return programs.reduce((programs: Program[], program: ProgramResponse) => {
    const currentProgram = mapToProgram(program, last(programs));
    return [...programs, currentProgram];
  }, []);
};

const mapToProgram = (program: ProgramResponse, lastProgram: Program | undefined): Program => {
  const startTime = parseTime(program.HORA_INICIO);
  const fixedTime = lastProgram?.startTime && lastProgram.startTime > startTime ? plusOneDay(startTime) : startTime;

  return { live: false, startTime: fixedTime, description: truncate(program.TITULO) };
};

const channelScheduleWithLiveProgram = ({ schedule, icon, name }: ChannelSchedule): ChannelSchedule => {
  const currentProgram = findLast(schedule, (program) => program.startTime < now());
  const programs = currentProgram ? scheduleWithLiveProgram(schedule, currentProgram) : schedule;
  return { icon, name, schedule: programs };
};

const scheduleWithLiveProgram = (programs: Program[], currentProgram: Program): Program[] => {
  return replace(currentProgram)
    .in(programs)
    .with({ ...currentProgram, live: true });
};

export const tvScheduleRepository = { getAll };
