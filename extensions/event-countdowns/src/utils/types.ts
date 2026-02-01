export type RepeatType = "none" | "yearly" | "monthly";

export type Event = {
  id: string;
  title: string;
  baseDate: string; // YYYY-MM-DD
  repeat: RepeatType;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
};

export type EventFormValues = {
  title: string;
  baseDate: string; // YYYY-MM-DD format
  repeat: RepeatType;
};
