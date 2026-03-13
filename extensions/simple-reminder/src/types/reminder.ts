import { Frequency } from "./frequency";

export type Reminder = {
  id: string;
  topic: string;
  date: Date;
  frequency?: Frequency;
};
