import fetch from "isomorphic-fetch";
import { parse } from "node-html-parser";

import { ChannelScheduleDto, ProgramDto, ProgramDetailsDto, TvScheduleDto } from "../domain/tvScheduleDto";
import { ProgramResponse } from "./dto/programResponse";
import { ChannelResponse } from "./dto/channelResponse";
import { now, parseTime, plusOneDay } from "../../../utils/dateUtils";
import { toString, truncate } from "../../../utils/stringUtils";
import { findLast, last, replace } from "../../../utils/collectionUtils";
import { Maybe } from "../../../utils/objectUtils";

const TV_GUIDE_URL = "https://www.movistarplus.es/programacion-tv?v=json";
const ICON_URL = "https://www.movistarplus.es/recorte/m-NEO/canal";
const ICON_EXTENSION = "png";

type Response = { data: object };

const getAll = async (): Promise<TvScheduleDto> => {
  return fetch(TV_GUIDE_URL, { headers: { Accept: "application/json" } })
    .then((response) => response.json() as unknown as Response)
    .then((response: Response) => Object.values(response.data))
    .then((channels: ChannelResponse[]) => channels.map(mapToChannel))
    .then((channelSchedules: ChannelScheduleDto[]) => channelSchedules.map(channelScheduleWithLiveProgram));
};

const getProgramDetails = async (program: ProgramDto): Promise<ProgramDetailsDto> => {
  return fetch(program.url)
    .then((response: { text: () => Promise<string> }) => response.text())
    .then((html: string) => {
      const document = parse(html);
      const image = document.querySelector("div.cover > img")?.getAttribute("src");
      const description = document.querySelector("div.show-content > div")?.innerText?.trim();
      return { ...program, image: toString(image), description: toString(description) };
    });
};

const mapToChannel = (channel: ChannelResponse): ChannelScheduleDto => {
  return {
    icon: `${ICON_URL}/${channel.DATOS_CADENA.CODIGO}.${ICON_EXTENSION}`,
    name: channel.DATOS_CADENA.NOMBRE,
    schedule: mapToSchedule(channel.PROGRAMAS),
  };
};

const mapToSchedule = (programs: ProgramResponse[]) => {
  return programs.reduce((programs: ProgramDto[], program: ProgramResponse) => {
    const currentProgram = mapToProgram(program, last(programs));
    return [...programs, currentProgram];
  }, []);
};

const mapToProgram = (program: ProgramResponse, lastProgram: Maybe<ProgramDto>): ProgramDto => {
  const isLive = program.DIRECTO;
  const startTime = parseTime(program.HORA_INICIO);
  const fixedTime = lastProgram?.startTime && lastProgram.startTime > startTime ? plusOneDay(startTime) : startTime;

  return { isLive, isCurrentlyLive: false, startTime: fixedTime, url: program.URL, title: truncate(program.TITULO) };
};

const channelScheduleWithLiveProgram = ({ schedule, icon, name }: ChannelScheduleDto): ChannelScheduleDto => {
  const currentProgram = findLast(schedule, (program) => program.startTime < now());
  const programs = currentProgram ? scheduleWithLiveProgram(schedule, currentProgram) : schedule;
  return { icon, name, schedule: programs };
};

const scheduleWithLiveProgram = (programs: ProgramDto[], currentProgram: ProgramDto): ProgramDto[] => {
  return replace(currentProgram)
    .in(programs)
    .with({ ...currentProgram, isCurrentlyLive: true });
};

export const tvScheduleRepository = { getAll, getProgramDetails };
