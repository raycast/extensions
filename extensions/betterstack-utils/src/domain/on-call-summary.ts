import { OnCallEvent } from "@/domain/on-call-event";
import { getColor } from "@/common/colors";
import { formatUserName } from "@/domain/user";
import { TimeWindow } from "@/common/utils/date-utils";

export type OnCallSummary = TeamMemberOnCallSummary[];

type TeamMemberOnCallSummary = TeamMemberOnCallTime & {
  teamMember: string;
  color: string;
};

type TeamMemberOnCallTime = {
  email: string;
  hours: number;
};

type MonthlyOnCallSummaryData = {
  year: number;
  month: number;
  events: OnCallEvent[];
};

export function computeOnCallSummary({ year, month, events }: MonthlyOnCallSummaryData): OnCallSummary {
  const monthWindow: TimeWindow = { start: new Date(year, month, 1), end: new Date(year, month + 1, 1) };
  const hoursByTeamMember = accumulateHours(events, monthWindow);

  return [...hoursByTeamMember.entries()]
    .map(([teamMember, { hours, email }]) => ({ teamMember, email, hours, color: getColor(teamMember) }))
    .toSorted((a, b) => b.hours - a.hours);
}

function accumulateHours(events: OnCallEvent[], timeWindow: TimeWindow): Map<string, TeamMemberOnCallTime> {
  return events.reduce((totalHours, event) => {
    const overlapStartTime = Math.max(new Date(event.startedAt).getTime(), timeWindow.start.getTime());
    const overlapEndTime = Math.min(new Date(event.endedAt).getTime(), timeWindow.end.getTime());
    const hours = (overlapEndTime - overlapStartTime) / (3600 * 1000);
    const userName = formatUserName(event.user);

    if (overlapEndTime <= overlapStartTime) return totalHours;

    const existingUser = totalHours.get(userName);
    return totalHours.set(userName, { hours: (existingUser?.hours ?? 0) + hours, email: event.user.email });
  }, new Map<string, TeamMemberOnCallTime>());
}
