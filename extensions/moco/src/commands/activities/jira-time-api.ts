import { z } from "zod";
import { api } from "../../utils/api";
import { JiraIssue, matchesJiraActivity } from "../../utils/jira";
import { getCurrentUser } from "../../utils/refresh";
import { nextActivityPage, readActivityPages, summarizeTicketTime } from "../../utils/ticket-time";
import { localDate } from "./utils";

const ticketActivitySchema = z.array(
  z.object({
    id: z.number().int().positive(),
    date: z.string(),
    user: z.object({ id: z.number().int().positive() }),
    worked_seconds: z.number().nonnegative().optional(),
    seconds: z.number().nonnegative().optional(),
    hours: z.number().nonnegative().optional(),
    timer_started_at: z.string().nullable().optional(),
    remote_service: z.string().nullable().optional(),
    remote_id: z.string().nullable().optional(),
    remote_url: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
  }),
);

export async function fetchJiraTicketTime(issue: JiraIssue, signal?: AbortSignal) {
  const user = await getCurrentUser();
  const activities = await readActivityPages(async (page) => {
    const response = await api.get("/activities", {
      // Search also finds the early fork's URL-in-description bookings. Exact identity is checked below.
      // No date or project restriction: include previous dates, projects, roles and billed entries.
      params: { user_id: user.id, term: issue.key, page, per_page: 100 },
      timeout: 15000,
      signal,
    });
    const rawTotal = response.headers["x-total"];
    const total = rawTotal === undefined ? undefined : Number(rawTotal);
    if (total !== undefined && (!Number.isSafeInteger(total) || total < 0))
      throw new Error("Invalid activity pagination.");
    return {
      activities: ticketActivitySchema.parse(response.data),
      nextPage: nextActivityPage(response.headers.link === undefined ? undefined : String(response.headers.link), page),
      total,
    };
  });
  return summarizeTicketTime(
    activities.filter((activity) => matchesJiraActivity(issue, activity)),
    user.id,
    localDate(),
  );
}
