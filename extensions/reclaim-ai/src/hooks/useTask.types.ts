import { AssistType, EventColor, RecurringAssignmentType } from "../types/event";

export interface CreateTaskProps {
  title: string;
  timePolicy: string;
  category: string;
  timeNeeded: number;
  durationMin: number;
  durationMax: number;
  snoozeUntil: Date;
  due: Date;
  notes: string;
  alwaysPrivate: boolean;
  priority: string;
  onDeck: boolean;
}

export interface TaskOrHabit {
  id?: number;
  type?: AssistType;
  created?: string;
  updated?: string;
  recurringAssignmentType?: RecurringAssignmentType;
  alwaysPrivate?: boolean;
  title?: string;
  // eventSubType?: EventSubType;
  // eventCategory?: EventCategory;
  eventColor?: EventColor;
  // invitees?: ThinPerson[];
  defendedDescription?: string;
  additionalDescription?: string;
  // priority?: PriorityLevel;
  location?: string;
}

export interface PlannerActionIntermediateResult {
  events: Event[];
  taskOrHabit?: TaskOrHabit | null;
  timeoutReached?: boolean | null;
  userInfoMessage?: string | null;
}
