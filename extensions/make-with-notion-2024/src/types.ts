export type ScheduleEvent = {
  name: string;
  from: string;
  to: string;
  location: string;
  speakers: Speaker[];
  description: string;
};

export type Speaker = {
  name: string;
  title: string;
  company: string;
  image: string;
};
