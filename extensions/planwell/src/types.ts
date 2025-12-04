export interface Class {
  id: string;
  name: string;
  color: string;
  occurrences: Occurrence[];
  content: string;
}

export interface Occurrence {
  dayOfWeek: number;
  period: string;
}

export interface Period {
  id: string;
  label: string;
  startTime?: string;
  endTime?: string;
  isSpecial: boolean;
}

export interface Event {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  color: string;
  content: string;
}

export interface Todo {
  id: string;
  name: string;
  isCompleted: boolean;
  color: string;
  content: string;
}
