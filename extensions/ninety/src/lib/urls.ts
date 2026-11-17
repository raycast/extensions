import { IssueInterval, MeetingType, PeriodInterval } from "../api/types";

const APP = "https://app.ninety.io";

/**
 * Adds `?team=<id>`. The Scorecard reads it to pick the team; other pages currently ignore it and
 * use the last team you viewed, but it's harmless and will start working if Ninety reads it there.
 */
const withTeam = (url: string, teamId?: string) => (teamId ? `${url}?team=${teamId}` : url);

/** Opens a section with one item in the app's detail panel, e.g. `/rocks(detail:detail/rock/<id>)`. */
const detail = (section: string, kind: string, id: string, teamId?: string) =>
  withTeam(`${APP}/${section}(detail:detail/${kind}/${id})`, teamId);

function meetingTypePath(type?: MeetingType) {
  if (type === "level10" || type === "quarterly") return type;
  if (type === "annualDayOne" || type === "annualDayTwo") return "annual";
  return type ? "other" : "level10";
}

/** Pages and item links in the Ninety web app (route names taken from app.ninety.io's router). */
export const NinetyUrls = {
  todos: `${APP}/todos`,
  issues: `${APP}/issues`,
  rocks: `${APP}/rocks`,
  headlines: `${APP}/headlines`,
  scorecard: `${APP}/data`,
  meetings: `${APP}/meetings`,
  developerSettings: `${APP}/settings/user/developer-settings`,

  todo: (todo: { id: string; isPersonal?: boolean; teamId?: string }) =>
    detail(
      todo.isPersonal ? "todos/personal" : "todos/team",
      "todo",
      todo.id,
      todo.isPersonal ? undefined : todo.teamId,
    ),
  issue: (issue: { id: string; intervalCode?: IssueInterval; teamId?: string }) =>
    detail(
      issue.intervalCode === "LONG_TERM" ? "issues/long-term" : "issues/short-term",
      "issue",
      issue.id,
      issue.teamId,
    ),
  rock: (rock: { _id: string; teamId?: string }) => detail("rocks", "rock", rock._id, rock.teamId),
  headline: (headline: { id: string; teamId?: string }) =>
    detail("headlines", "headline", headline.id, headline.teamId),
  /**
   * The Meetings page for a meeting's type. Upcoming meetings can't be linked directly: Ninety only
   * gives a meeting an Id once it starts, and the public API doesn't return in-progress meetings.
   */
  meetingsOfType: (type?: MeetingType, teamId?: string) => withTeam(`${APP}/meetings/${meetingTypePath(type)}`, teamId),
  /** A concluded Meeting in the Past Meetings list. */
  pastMeeting: (meeting: { id: string; teamId?: string }) =>
    detail("meetings/past-meetings", "meeting", meeting.id, meeting.teamId),
  kpi: (interval: PeriodInterval, groupId: string, kpiId: string, teamId?: string) =>
    withTeam(`${APP}/data/scorecards/${interval}(detail:detail/kpi/kpiGroups/${groupId}/kpis/${kpiId}/edit)`, teamId),
};
