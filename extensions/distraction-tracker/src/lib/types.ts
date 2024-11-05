import { feelings } from "./feelings";

export interface Distraction {
  id: string;
  time: Date;
  title: string;
  feeling: keyof typeof feelings;
  internalTrigger: boolean;
  externalTrigger: boolean;
  planningProblem: boolean;
  ideas: string;
}

export interface DistractionFormValues {
  time: Date | null;
  title: string;
  feeling: string;
  internalTrigger: boolean;
  externalTrigger: boolean;
  planningProblem: boolean;
  ideas: string;
}
