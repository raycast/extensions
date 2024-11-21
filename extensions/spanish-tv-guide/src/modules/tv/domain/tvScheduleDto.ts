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
