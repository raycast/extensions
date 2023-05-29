type Program = {
  startTime: Date;
  description: string;
  live: boolean;
};

export type ChannelSchedule = {
  icon: string;
  name: string;
  schedule: Program[];
};

export type TVSchedule = ChannelSchedule[];
