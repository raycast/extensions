import { findLast, replace } from "../../../utils/collectionUtils";
import { now } from "../../../utils/dateUtils";

export type ChannelScheduleDto = {
  icon: string;
  name: string;
  schedule: ProgramDto[];
};

export type ProgramDto = {
  url: string;
  name: string;
  startTime: Date;
  isCurrentlyLive: boolean;
};

export type ProgramDetailsDto = {
  imageUrl: string;
  headline: string;
  description: string;
};

export const upToDateChannelSchedule = (schedule: ProgramDto[]) => {
  const currentProgram = schedule.findIndex((program) => program.isCurrentlyLive);
  const previousProgram = Math.max(0, currentProgram - 2);
  return schedule.slice(previousProgram, schedule.length);
};

export type TvScheduleDto = ChannelScheduleDto[];

export const toLocalizedTvSchedule = (schedule: TvScheduleDto): TvScheduleDto => {
  return schedule.map((channelSchedule) => {
    return { ...channelSchedule, schedule: channelScheduleWithLiveProgram(channelSchedule.schedule) };
  });
};

const channelScheduleWithLiveProgram = (programs: ProgramDto[]): ProgramDto[] => {
  const currentProgram = findLast(programs, (program) => program.startTime < now());
  return currentProgram ? scheduleWithLiveProgram(programs, currentProgram) : programs;
};

const scheduleWithLiveProgram = (programs: ProgramDto[], currentProgram: ProgramDto): ProgramDto[] => {
  return replace(currentProgram)
    .in(programs)
    .with({ ...currentProgram, isCurrentlyLive: true });
};
