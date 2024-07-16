export type ChannelScheduleDto = {
  icon: string;
  name: string;
  schedule: ProgramDto[];
};

export type ProgramDto = {
  title: string;
  startTime: Date;
  isCurrentlyLive: boolean;
  isLive: boolean;
  url: string;
};

export type ProgramDetailsDto = {
  title: string;
  startTime: Date;
  image: string;
  description: string;
};

export const upToDateChannelSchedule = (schedule: ProgramDto[]) => {
  const currentProgram = schedule.findIndex((program) => program.isCurrentlyLive);
  const previousProgram = Math.max(0, currentProgram - 2);
  return schedule.slice(previousProgram, schedule.length);
};

export type TvScheduleDto = ChannelScheduleDto[];
