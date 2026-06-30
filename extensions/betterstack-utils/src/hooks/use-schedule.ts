import { useReducer } from "react";
import { match } from "ts-pattern";
import { getCurrentMonthWindow, getCurrentWeekWindow } from "@/common/utils/date-utils";
import { formatUserName } from "@/domain/user";
import { TimeRange } from "@/domain/time-range";
import { getOnCallUser, OnCallEvent } from "@/domain/on-call-event";

type ScheduleState = {
  timeRange: TimeRange;
  selectedUser: string;
  offset: number;
};

const ScheduleActionType = {
  SET_TIME_RANGE: "SET_TIME_RANGE",
  SET_SELECTED_USER: "SET_SELECTED_USER",
  SET_OFFSET: "SET_OFFSET",
} as const;

type ScheduleAction =
  | { type: typeof ScheduleActionType.SET_TIME_RANGE; payload: TimeRange }
  | { type: typeof ScheduleActionType.SET_SELECTED_USER; payload: string }
  | { type: typeof ScheduleActionType.SET_OFFSET; payload: number };

const initialScheduleState: ScheduleState = {
  timeRange: TimeRange.MONTH,
  selectedUser: "",
  offset: 0,
};

export function useSchedule({ events }: { events: OnCallEvent[] }) {
  const [{ timeRange, selectedUser, offset }, dispatch] = useReducer(scheduleReducer, initialScheduleState);

  const filteredEvents = selectedUser ? events.filter((event) => formatUserName(event.user) === selectedUser) : events;
  const userNames = new Set(events.map((event) => formatUserName(event.user)));
  const onCallUser = getOnCallUser(events);
  const timeWindow = timeRange === TimeRange.WEEK ? getCurrentWeekWindow(offset) : getCurrentMonthWindow(offset);

  const setTimeRange = (range: TimeRange) => dispatch({ type: ScheduleActionType.SET_TIME_RANGE, payload: range });
  const setOffset = (newOffset: number) => dispatch({ type: ScheduleActionType.SET_OFFSET, payload: newOffset });
  const setSelectedUser = (user: string) => dispatch({ type: ScheduleActionType.SET_SELECTED_USER, payload: user });

  return {
    timeData: { timeRange, timeWindow, offset, setTimeRange, setOffset },
    userData: { userNames: Array.from(userNames), selectedUser, onCallUser, setSelectedUser },
    scheduleEvents: filteredEvents,
  };
}

function scheduleReducer(state: ScheduleState, action: ScheduleAction): ScheduleState {
  return match(action)
    .with({ type: ScheduleActionType.SET_TIME_RANGE }, ({ payload }) => ({ ...state, timeRange: payload, offset: 0 }))
    .with({ type: ScheduleActionType.SET_SELECTED_USER }, ({ payload }) => ({ ...state, selectedUser: payload }))
    .with({ type: ScheduleActionType.SET_OFFSET }, ({ payload }) => ({ ...state, offset: payload }))
    .exhaustive();
}
