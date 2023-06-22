type Program = {
  startTime: Date;
  description: string;
};

export type ChannelSchedule = {
  icon: string;
  name: string;
  schedule: Program[];
};

export type TVSchedule = ChannelSchedule[];
