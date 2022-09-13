export type Session = {
  id: number;
  name: string;
  startTime: number;
  endTime?: number | undefined;
  duration?: number | undefined;
};

export type SessionArguments = {
  name?: string;
};

export type Preferences = {
  sessionDuration: string;
  notificationSound: "Blow" | "Bottle" | "Frog" | "Glass" | "Hero" | "Submarine";
};
