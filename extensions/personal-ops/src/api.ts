import { getPreferenceValues } from "@raycast/api";
import { GoogleGenAI } from "@google/genai";
import { readFileSync } from "node:fs";

type Preferences = {
  envPath?: string;
  timezone?: string;
  linearApiKey?: string;
  linearDefaultTeam?: string;
  googleClientId?: string;
  googleClientSecret?: string;
  googleRefreshToken?: string;
  geminiApiKey?: string;
  geminiModel?: string;
  briefTone?: BriefTone;
  summaryMode?: SummaryMode;
  useGeminiCache?: boolean;
};

export type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  responseStatus: string | null;
  location: string | null;
  htmlLink: string | null;
};

export type EmailItem = {
  from: string;
  subject: string;
  date: string;
  snippet: string;
};

export type LinearIssue = {
  identifier: string;
  title: string;
  priority: number;
  priorityLabel: string | null;
  url: string;
  dueDate: string | null;
  updatedAt: string;
  state: { name: string; type: string };
  labels: { nodes: { name: string }[] };
};

export type BriefData = {
  today: ReturnType<typeof partsForToday>;
  calendar: CalendarEvent[];
  emails: EmailItem[];
  linear: LinearIssue[];
  actions: string[];
  aiSummary: GeminiBriefSummary | null;
};

export type GeminiBriefSummary = {
  calendar: BriefContext;
  email: BriefContext;
  linear: BriefContext;
  attention: BriefContext;
};

export type BriefContext = {
  shortContext: string;
  expandedContext: string;
};

export type BriefTone = "crisp" | "friendly" | "savage" | "founder";
export type SummaryMode = "hybrid" | "gemini";

export async function getBriefData(): Promise<BriefData> {
  const timezone = config("TIMEZONE") || "Asia/Kolkata";
  const today = partsForToday(timezone);
  const [rawCalendar, emails, linear] = await Promise.all([
    getCalendarEvents(),
    getImportantUnreadEmails(),
    getLinearIssues(),
  ]);
  const calendar = rawCalendar.filter((event) => event.responseStatus?.toLowerCase() !== "declined");
  const actions = buildActions({ calendar, emails, linear });
  return {
    today,
    calendar,
    emails,
    linear,
    actions,
    aiSummary: null,
  };
}

export function getBriefTone(): BriefTone {
  const tone = config("BRIEF_TONE");
  if (tone === "friendly" || tone === "savage" || tone === "founder") return tone;
  return "crisp";
}

export function getSummaryMode(): SummaryMode {
  return config("SUMMARY_MODE") === "gemini" ? "gemini" : "hybrid";
}

export function shouldUseGeminiCache() {
  return config("USE_GEMINI_CACHE") !== "false";
}

export async function getCalendarEvents(): Promise<CalendarEvent[]> {
  const day = partsForToday(config("TIMEZONE") || "Asia/Kolkata");
  const accessToken = await getGoogleAccessToken();
  const url = new URL(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
  );
  url.searchParams.set("timeMin", day.startIso);
  url.searchParams.set("timeMax", day.endIso);
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("maxResults", "30");

  const json = await googleGet<{ items?: GoogleCalendarEvent[] }>(
    url,
    accessToken,
  );
  return (json.items || []).map((event) => ({
    id: event.id,
    title: event.summary || "(untitled)",
    start: event.start?.dateTime || event.start?.date || "",
    end: event.end?.dateTime || event.end?.date || "",
    responseStatus:
      event.attendees?.find((attendee) => attendee.self)?.responseStatus ||
      null,
    location: event.location || null,
    htmlLink: event.htmlLink || null,
  }));
}

export async function respondToCalendarEvent(
  eventId: string,
  responseStatus: "accepted" | "declined" | "tentative",
) {
  const accessToken = await getGoogleAccessToken();
  const getUrl = new URL(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`,
  );
  const event = await googleGet<GoogleCalendarEvent>(getUrl, accessToken);
  const attendees = event.attendees || [];
  const selfIndex = attendees.findIndex((attendee) => attendee.self);

  if (selfIndex === -1) {
    throw new Error(
      `No self attendee found on "${event.summary || eventId}". Cannot safely respond.`,
    );
  }

  attendees[selfIndex] = { ...attendees[selfIndex], responseStatus };

  const patchUrl = new URL(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`,
  );
  patchUrl.searchParams.set("sendUpdates", "all");
  const response = await fetch(patchUrl, {
    method: "PATCH",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ attendees }),
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(
      `Calendar response failed: ${JSON.stringify(json, null, 2)}`,
    );
  }
  return json as GoogleCalendarEvent;
}

export async function getImportantUnreadEmails(): Promise<EmailItem[]> {
  const accessToken = await getGoogleAccessToken();
  const listUrl = new URL(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages",
  );
  listUrl.searchParams.set(
    "q",
    "in:inbox is:unread -in:spam -in:trash -category:promotions newer_than:14d",
  );
  listUrl.searchParams.set("maxResults", "10");

  const list = await googleGet<{ messages?: { id: string }[] }>(
    listUrl,
    accessToken,
  );
  return Promise.all(
    (list.messages || []).map(async (message) => {
      const url = new URL(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}`,
      );
      url.searchParams.set("format", "metadata");
      url.searchParams.set("metadataHeaders", "From");
      url.searchParams.append("metadataHeaders", "Subject");
      url.searchParams.append("metadataHeaders", "Date");
      const detail = await googleGet<GmailMessage>(url, accessToken);
      const headers = Object.fromEntries(
        (detail.payload?.headers || []).map((header) => [
          header.name.toLowerCase(),
          header.value,
        ]),
      );
      return {
        from: headers.from || "(unknown sender)",
        subject: headers.subject || "(no subject)",
        date: headers.date || "",
        snippet: detail.snippet || "",
      };
    }),
  );
}

export async function getLinearIssues(): Promise<LinearIssue[]> {
  const json = await linearGraphql<{
    viewer: { assignedIssues: { nodes: LinearIssue[] } };
  }>(`
    query MorningBriefIssues {
      viewer {
        assignedIssues(first: 50, orderBy: updatedAt, includeArchived: false) {
          nodes {
            identifier
            title
            priority
            priorityLabel
            url
            dueDate
            updatedAt
            state { name type }
            labels { nodes { name } }
          }
        }
      }
    }
  `);
  return json.viewer.assignedIssues.nodes.filter(
    (issue) => !["completed", "canceled"].includes(issue.state?.type),
  );
}

export async function createLinearIssue({
  title,
  description,
  team,
}: {
  title: string;
  description: string;
  team?: string;
}) {
  const teamName = team || config("LINEAR_DEFAULT_TEAM");
  if (!teamName)
    throw new Error("Set LINEAR_DEFAULT_TEAM in .env or Raycast preferences.");

  const [teamId, viewerId] = await Promise.all([
    getLinearTeamId(teamName),
    getLinearViewerId(),
  ]);
  const json = await linearGraphql<{
    issueCreate: {
      success: boolean;
      issue: { identifier: string; title: string; url: string };
    };
  }>(
    `
      mutation CreateIssue($input: IssueCreateInput!) {
        issueCreate(input: $input) {
          success
          issue { identifier title url }
        }
      }
    `,
    { input: { teamId, title, description, assigneeId: viewerId } },
  );

  if (!json.issueCreate.success)
    throw new Error("Linear issueCreate returned success=false.");
  return json.issueCreate.issue;
}

export function formatWhen(start: string, end: string) {
  if (!start || !end) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(start)) return "All day";
  return `${start.slice(11, 16)}-${end.slice(11, 16)}`;
}

export function normalizeStatus(
  status: string,
): "accepted" | "declined" | "tentative" {
  const normalized = status.toLowerCase();
  if (["yes", "accept", "accepted"].includes(normalized)) return "accepted";
  if (["no", "decline", "declined"].includes(normalized)) return "declined";
  if (["maybe", "tentative"].includes(normalized)) return "tentative";
  throw new Error("Status must be yes, no, or maybe.");
}

export function parseMeetingTitle(text: string) {
  return text
    .replace(/\s+/g, " ")
    .replace(/(^|\s)(say|respond|reply|rsvp|please)(?=\s|$)/gi, " ")
    .replace(
      /(^|\s)(yes|accept|accepted|no|decline|declined|maybe|tentative)(?=\s|$)/gi,
      " ",
    )
    .replace(
      /(^|\s)(to|for|the|meeting|event|invite|invitation)(?=\s|$)/gi,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
}

export function parseStatus(text: string) {
  const normalized = text.toLowerCase();
  if (/\b(yes|accept|accepted)\b/.test(normalized)) return "accepted";
  if (/\b(no|decline|declined)\b/.test(normalized)) return "declined";
  if (/\b(maybe|tentative)\b/.test(normalized)) return "tentative";
  return null;
}

export function buildActions({
  calendar,
  emails,
  linear,
}: {
  calendar: CalendarEvent[];
  emails: EmailItem[];
  linear: LinearIssue[];
}) {
  const actions: string[] = [];
  for (const event of calendar
    .filter(
      (event) => event.responseStatus && event.responseStatus !== "accepted",
    )
    .slice(0, 3)) {
    actions.push(`Respond to calendar invite: ${event.title}.`);
  }
  for (const issue of linear
    .filter((issue) => issue.priority <= 1)
    .slice(0, 3)) {
    actions.push(`Prioritize ${issue.identifier}: ${issue.title}.`);
  }
  if (emails.some((email) => /api key|security alert/i.test(email.subject) && /linear/i.test(`${email.from} ${email.subject}`))) {
    actions.push("Verify the Linear API key email was expected.");
  }
  if (emails.some((email) => /login code|verification code/i.test(email.subject))) {
    actions.push("Verify recent login-code emails were expected.");
  } else if (emails.length > 0) {
    actions.push("Review important unread inbox items.");
  }
  return actions.length > 0 ? actions : ["No urgent action found."];
}

function partsForToday(timezone: string) {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long",
  }).formatToParts(now);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  const ymd = `${values.year}-${values.month}-${values.day}`;
  return {
    label: `${values.weekday}, ${ymd}`,
    shortLabel: `${values.weekday}, ${monthName(values.month)} ${Number(values.day)}`,
    startIso: `${ymd}T00:00:00+05:30`,
    endIso: `${ymd}T23:59:59+05:30`,
  };
}

export async function getGeminiBriefSummary(
  data: Omit<BriefData, "aiSummary">,
): Promise<GeminiBriefSummary | null> {
  const apiKey = config("GEMINI_API_KEY");
  if (!apiKey) return null;

  const tone = getBriefTone();
  const model = config("GEMINI_MODEL") || "gemini-3.1-flash-lite";
  const ai = new GoogleGenAI({ apiKey });

  const payload = {
    tone,
    date: data.today.shortLabel,
    calendar: data.calendar.map((event) => ({
      title: event.title,
      when: formatWhen(event.start, event.end),
      responseStatus: event.responseStatus || "none",
      location: event.location,
      allDay: /^\d{4}-\d{2}-\d{2}$/.test(event.start),
    })),
    emails: data.emails.slice(0, 8).map((email) => ({
      from: email.from,
      subject: email.subject,
      snippet: email.snippet,
    })),
    linear: data.linear.slice(0, 10).map((issue) => ({
      identifier: issue.identifier,
      title: issue.title,
      state: issue.state?.name,
      priority: issue.priorityLabel,
      dueDate: issue.dueDate,
    })),
    actions: data.actions,
  };

  try {
    const response = await ai.models.generateContent({
      model,
      contents: `Write a compact morning brief for Raycast.

Rules:
- Return JSON only.
- For each row, return a very short shortContext and a useful expandedContext.
- Keep every shortContext under 85 characters.
- Return email as one row object that summarizes all important unread emails together.
- expandedContext can be longer, but keep it practical and action-oriented.
- Be calm, useful, and very easy to understand.
- Use this tone: ${toneInstruction(tone)}
- Mention only things worth attention today.
- Never mention declined calendar events.
- Do not invent facts.
- If everything is accepted, say that clearly.
- Prefer issue IDs over long Linear titles.
- The Raycast row will show shortContext; the detail pane will show expandedContext.

Data:
${JSON.stringify(payload, null, 2)}`,
      config: {
        temperature: 0.2,
        maxOutputTokens: 512,
        responseMimeType: "application/json",
        responseJsonSchema: {
          type: "object",
          properties: {
            calendar: { type: "object", properties: contextSchemaProperties(), required: ["shortContext", "expandedContext"] },
            email: { type: "object", properties: contextSchemaProperties(), required: ["shortContext", "expandedContext"] },
            linear: { type: "object", properties: contextSchemaProperties(), required: ["shortContext", "expandedContext"] },
            attention: { type: "object", properties: contextSchemaProperties(), required: ["shortContext", "expandedContext"] },
          },
          required: ["calendar", "email", "linear", "attention"],
        },
      },
    });
    const summary = normalizeGeminiSummary(JSON.parse(response.text || ""));
    if (!summary) throw new Error("Gemini returned an unreadable summary. Showing deterministic brief.");
    return summary;
  } catch (error) {
    throw new Error(toGeminiBriefErrorMessage(error));
  }
}

function toGeminiBriefErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (/quota|resource_exhausted|429/i.test(message)) return "Gemini quota is exhausted. Showing deterministic brief.";
  if (/api key|api_key|unauthorized|permission|401|403/i.test(message)) return "Gemini API key was rejected. Showing deterministic brief.";
  if (/model|not found|404/i.test(message)) return "Gemini model is unavailable. Showing deterministic brief.";
  if (/json|unexpected token|unreadable summary/i.test(message)) return "Gemini returned an unreadable summary. Showing deterministic brief.";
  return "Gemini summary failed. Showing deterministic brief.";
}

function normalizeGeminiSummary(value: unknown): GeminiBriefSummary | null {
  if (!value || typeof value !== "object") return null;
  const summary = value as Partial<GeminiBriefSummary>;
  const calendar = normalizeBriefContext(summary.calendar, 95, 800);
  const email = normalizeEmailContext(summary.email);
  const linear = normalizeBriefContext(summary.linear, 95, 800);
  const attention = normalizeBriefContext(summary.attention, 95, 800);
  if (!calendar || !email || !linear || !attention) return null;

  return {
    calendar,
    email,
    linear,
    attention,
  };
}

function normalizeEmailContext(value: unknown): BriefContext | null {
  if (Array.isArray(value)) {
    const contexts = value
      .slice(0, 3)
      .map((line) => normalizeBriefContext(line, 95, 800))
      .filter((line): line is BriefContext => Boolean(line));
    if (contexts.length === 0) return null;
    return {
      shortContext: cleanSummaryLine(contexts.map((context) => context.shortContext.replace(/\.$/, "")).join("; "), 95),
      expandedContext: cleanSummaryLine(contexts.map((context) => `- ${context.expandedContext.replace(/\.$/, "")}.`).join("\n"), 800),
    };
  }

  return normalizeBriefContext(value, 95, 800);
}

function contextSchemaProperties() {
  return {
    shortContext: { type: "string" },
    expandedContext: { type: "string" },
  };
}

function normalizeBriefContext(value: unknown, shortMax: number, expandedMax: number): BriefContext | null {
  if (typeof value === "string") {
    const cleaned = cleanSummaryLine(value, expandedMax);
    if (!cleaned) return null;
    return {
      shortContext: cleanSummaryLine(cleaned, shortMax),
      expandedContext: cleaned,
    };
  }

  if (!value || typeof value !== "object") return null;
  const context = value as Partial<BriefContext>;
  if (typeof context.shortContext !== "string" || typeof context.expandedContext !== "string") return null;

  const shortContext = cleanSummaryLine(context.shortContext, shortMax);
  const expandedContext = cleanSummaryLine(context.expandedContext, expandedMax);
  if (!shortContext || !expandedContext) return null;

  return { shortContext, expandedContext };
}

function cleanSummaryLine(value: string, maxLength: number) {
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, maxLength - 1).trim()}…`;
}

function monthName(month: string) {
  return new Intl.DateTimeFormat("en-US", { month: "long" }).format(
    new Date(`2026-${month}-01T00:00:00Z`),
  );
}

async function getGoogleAccessToken() {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: required("GOOGLE_CLIENT_ID"),
      client_secret: required("GOOGLE_CLIENT_SECRET"),
      refresh_token: required("GOOGLE_REFRESH_TOKEN"),
      grant_type: "refresh_token",
    }),
  });
  const json = await response.json();
  if (!response.ok)
    throw new Error(`Google refresh failed: ${JSON.stringify(json)}`);
  return (json as { access_token: string }).access_token;
}

async function googleGet<T>(url: URL, accessToken: string): Promise<T> {
  const response = await fetch(url, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  const json = await response.json();
  if (!response.ok)
    throw new Error(`Google API failed: ${JSON.stringify(json)}`);
  return json as T;
}

async function linearGraphql<T>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  const response = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: required("LINEAR_API_KEY"),
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = (await response.json()) as { data?: T; errors?: unknown };
  if (!response.ok || json.errors || !json.data) {
    throw new Error(`Linear API failed: ${JSON.stringify(json, null, 2)}`);
  }
  return json.data;
}

async function getLinearViewerId() {
  const json = await linearGraphql<{ viewer: { id: string } }>(
    `query Viewer { viewer { id } }`,
  );
  return json.viewer.id;
}

async function getLinearTeamId(teamName: string) {
  const json = await linearGraphql<{
    teams: { nodes: { id: string; name: string }[] };
  }>(
    `
      query Teams($filter: TeamFilter) {
        teams(first: 50, filter: $filter) { nodes { id name } }
      }
    `,
    { filter: { name: { eq: teamName } } },
  );
  const team = json.teams.nodes[0];
  if (!team) throw new Error(`Linear team not found: ${teamName}`);
  return team.id;
}

function required(name: string) {
  const value = config(name);
  if (!value)
    throw new Error(`Missing ${name}. Add it to .env or Raycast preferences.`);
  return value;
}

function config(name: string) {
  const prefs = getPreferenceValues<Preferences>();
  const env = prefs.envPath ? loadEnv(prefs.envPath) : {};
  const preferenceMap: Record<string, string | undefined> = {
    GOOGLE_CLIENT_ID: prefs.googleClientId,
    GOOGLE_CLIENT_SECRET: prefs.googleClientSecret,
    GOOGLE_REFRESH_TOKEN: prefs.googleRefreshToken,
    GEMINI_API_KEY: prefs.geminiApiKey,
    GEMINI_MODEL: prefs.geminiModel,
    BRIEF_TONE: prefs.briefTone,
    SUMMARY_MODE: prefs.summaryMode,
    USE_GEMINI_CACHE: typeof prefs.useGeminiCache === "boolean" ? String(prefs.useGeminiCache) : undefined,
    LINEAR_API_KEY: prefs.linearApiKey,
    LINEAR_DEFAULT_TEAM: prefs.linearDefaultTeam,
    TIMEZONE: prefs.timezone,
  };
  return preferenceMap[name] || env[name] || process.env[name];
}

function toneInstruction(tone: BriefTone) {
  if (tone === "friendly") return "warm, reassuring, and lightly conversational.";
  if (tone === "savage") return "direct, blunt, and witty, but never rude or insulting.";
  if (tone === "founder") return "high-agency, priority-driven, and focused on leverage.";
  return "crisp, neutral, and extremely concise.";
}

function loadEnv(path: string) {
  const result: Record<string, string> = {};
  try {
    const content = readFileSync(path, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      result[trimmed.slice(0, eq).trim()] = trimmed
        .slice(eq + 1)
        .trim()
        .replace(/^["']|["']$/g, "");
    }
  } catch {
    // Preferences can provide values when the env file does not exist.
  }
  return result;
}

type GoogleCalendarEvent = {
  id: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  attendees?: { self?: boolean; responseStatus?: string }[];
  location?: string;
  htmlLink?: string;
};

type GmailMessage = {
  snippet?: string;
  payload?: { headers?: { name: string; value: string }[] };
};
