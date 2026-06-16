import { Action, ActionPanel, Color, Detail, Icon, List, LocalStorage, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { CalendarItem, LinearIssueItem } from "./components";
import { BriefContext, BriefData, CalendarEvent, EmailItem, formatWhen, GeminiBriefSummary, getBriefData, getBriefTone, getGeminiBriefSummary, getSummaryMode, LinearIssue, shouldUseGeminiCache } from "./api";

export default function Command() {
  const { data, isLoading, error, revalidate } = usePromise(getBriefData, [], { execute: true });
  const [aiSummary, setAiSummary] = useState<GeminiBriefSummary | null>(null);
  const [isGeminiLoading, setIsGeminiLoading] = useState(false);
  const [geminiError, setGeminiError] = useState<string | null>(null);
  const summaryMode = getSummaryMode();
  const useCache = shouldUseGeminiCache();

  useEffect(() => {
    if (!data) return;

    let cancelled = false;
    const cacheKey = briefCacheKey(data);

    async function refreshAiSummary() {
      setIsGeminiLoading(true);
      setGeminiError(null);

      const cached = useCache ? await LocalStorage.getItem<string>(cacheKey) : null;
      if (!cancelled && cached && useCache) {
        const parsed = parseCachedSummary(cached);
        if (parsed) setAiSummary(parsed);
      }

      let fresh: GeminiBriefSummary | null = null;
      try {
        fresh = await getGeminiBriefSummary(data);
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "Gemini summary failed. Showing deterministic brief.";
        setAiSummary(null);
        setGeminiError(message);
        setIsGeminiLoading(false);
        await showToast({ style: Toast.Style.Failure, title: "Gemini summary failed", message });
        return;
      }

      setIsGeminiLoading(false);
      if (!fresh) return;

      setAiSummary(fresh);
      if (useCache) await LocalStorage.setItem(cacheKey, JSON.stringify(fresh));
    }

    setAiSummary(null);
    refreshAiSummary();

    return () => {
      cancelled = true;
    };
  }, [data, useCache]);

  if (error) {
    return <Detail markdown={`# Morning brief failed\n\n\`\`\`\n${error.message}\n\`\`\``} actions={<ActionPanel><Action title="Retry" icon={Icon.RotateClockwise} onAction={revalidate} /></ActionPanel>} />;
  }

  return (
    <List isLoading={isLoading || isGeminiLoading} isShowingDetail searchBarPlaceholder="Search today's brief...">
      {data ? (
        <>
          <List.Section title={`Morning brief for ${data.today.shortLabel}`}>
            {summaryMode === "gemini" && !aiSummary && isGeminiLoading ? (
              <List.Item
                title="Writing Gemini brief..."
                icon={{ source: Icon.Clock, tintColor: Color.Blue }}
                detail={<List.Item.Detail markdown="# Writing Gemini brief\n\nDeterministic brief will appear if Gemini fails." />}
                actions={<ActionPanel><Action title="Retry" icon={Icon.RotateClockwise} onAction={revalidate} /></ActionPanel>}
              />
            ) : null}
            {geminiError ? (
              <List.Item
                title="Gemini fallback"
                icon={{ source: Icon.ExclamationMark, tintColor: Color.Orange }}
                detail={<List.Item.Detail markdown={`# Gemini fallback\n\n${escapeMarkdown(geminiError)}`} />}
                actions={<ActionPanel><Action title="Refresh Brief" icon={Icon.RotateClockwise} onAction={revalidate} /></ActionPanel>}
              />
            ) : null}
            {(summaryMode === "gemini" && !aiSummary && isGeminiLoading ? [] : buildSimpleBrief({ ...data, aiSummary })).map((item) => (
              <List.Item
                key={item.label}
                id={`summary-${item.label}`}
                title={item.heading}
                icon={{ source: item.icon, tintColor: item.color }}
                detail={
                  <List.Item.Detail
                    markdown={buildSummaryDetailMarkdown(item, data)}
                  />
                }
                actions={
                  <ActionPanel>
                    <Action title="Refresh Brief" icon={Icon.RotateClockwise} onAction={revalidate} />
                    <Action.CopyToClipboard title="Copy Context" content={item.context.expandedContext} />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>

          <List.Section title="Calendar">
            {data.calendar.length === 0 ? <List.Item title="No calendar events found" icon={Icon.Calendar} /> : data.calendar.map((event) => <CalendarItem key={event.id} event={event} onRespond={revalidate} />)}
          </List.Section>

          <List.Section title="Important Unread Email">
            {data.emails.length === 0 ? <List.Item title="No important unread email found" icon={Icon.Envelope} /> : data.emails.slice(0, 8).map((email) => (
              <List.Item
                key={`${email.from}-${email.subject}`}
                title={email.subject}
                subtitle={email.from}
                icon={{ source: Icon.Envelope, tintColor: /login code|verification code/i.test(email.subject) ? Color.Red : Color.Green }}
                detail={
                  <List.Item.Detail
                    markdown={`# ${escapeMarkdown(email.subject)}\n\n${email.snippet || "No snippet available."}`}
                    metadata={
                      <List.Item.Detail.Metadata>
                        <List.Item.Detail.Metadata.Label title="From" text={email.from} />
                        {email.date ? <List.Item.Detail.Metadata.Label title="Date" text={email.date} /> : null}
                      </List.Item.Detail.Metadata>
                    }
                  />
                }
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard title="Copy Subject" content={email.subject} />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>

          <List.Section title="Linear">
            {data.linear.length === 0 ? <List.Item title="No active assigned issues found" icon={Icon.Ticket} /> : data.linear.slice(0, 8).map((issue) => <LinearIssueItem key={issue.identifier} issue={issue} />)}
          </List.Section>
        </>
      ) : null}
    </List>
  );
}

function briefCacheKey(data: BriefData) {
  const signature = [
    data.today.label,
    getBriefTone(),
    data.calendar.map((event) => `${event.id}:${event.responseStatus}:${event.start}`).join("|"),
    data.emails.map((email) => `${email.from}:${email.subject}`).join("|"),
    data.linear.map((issue) => `${issue.identifier}:${issue.state?.name}:${issue.priorityLabel}:${issue.dueDate || ""}`).join("|"),
  ].join("::");
  return `brief-summary:v2:${hashString(signature)}`;
}

function parseCachedSummary(value: string) {
  try {
    const parsed = JSON.parse(value) as GeminiBriefSummary;
    if (parsed && isBriefContext(parsed.calendar) && isBriefContext(parsed.email) && isBriefContext(parsed.linear) && isBriefContext(parsed.attention)) return parsed;
  } catch {
    // Ignore cache corruption; the deterministic summary is already visible.
  }
  return null;
}

function isBriefContext(value: unknown): value is BriefContext {
  return Boolean(value && typeof value === "object" && typeof (value as BriefContext).shortContext === "string" && typeof (value as BriefContext).expandedContext === "string");
}

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

type BriefLine = {
  label: string;
  heading: string;
  context: BriefContext;
  icon: Icon;
  color: Color;
};

function buildSimpleBrief(data: BriefData): BriefLine[] {
  if (data.aiSummary) {
    return [
      {
        label: "calendar",
        heading: "Calendar",
        context: data.aiSummary.calendar,
        icon: Icon.Calendar,
        color: Color.Blue,
      },
      {
        label: "email",
        heading: "Email",
        context: data.aiSummary.email,
        icon: Icon.Envelope,
        color: Color.Green,
      },
      {
        label: "linear",
        heading: "Linear",
        context: data.aiSummary.linear,
        icon: Icon.Ticket,
        color: Color.Purple,
      },
      {
        label: "attention",
        heading: "Attention today",
        context: data.aiSummary.attention,
        icon: Icon.ExclamationMark,
        color: Color.Orange,
      },
    ];
  }

  return [
    {
      label: "calendar",
      heading: "Calendar",
      context: summarizeCalendar(data.calendar),
      icon: Icon.Calendar,
      color: Color.Blue,
    },
    {
      label: "email",
      heading: "Email",
      context: summarizeEmail(data.emails),
      icon: Icon.Envelope,
      color: Color.Green,
    },
    {
      label: "linear",
      heading: "Linear",
      context: summarizeLinear(data.linear),
      icon: Icon.Ticket,
      color: Color.Purple,
    },
    {
      label: "attention",
      heading: "Attention today",
      context: summarizeAttention(data),
      icon: Icon.ExclamationMark,
      color: Color.Orange,
    },
  ];
}

function combineEmailContexts(contexts: BriefContext[]): BriefContext {
  if (contexts.length === 0) {
    return {
      shortContext: "No important unread emails found.",
      expandedContext: "No unread inbox emails matched the important-email filter.",
    };
  }

  return {
    shortContext: contexts.map((context) => context.shortContext.replace(/\.$/, "")).join("; "),
    expandedContext: contexts.map((context) => `- ${context.expandedContext.replace(/\.$/, "")}.`).join("\n"),
  };
}

function summarizeCalendar(events: CalendarEvent[]) {
  const meetings = events.filter((event) => !isAllDay(event));
  if (meetings.length === 0) {
    return {
      shortContext: "No timed meetings today.",
      expandedContext: events.length > 0 ? `All-day context: ${events.map((event) => event.title).join(", ")}.` : "No calendar events found for today.",
    };
  }

  const meetingText = meetings.slice(0, 4).map((event) => `${event.title} ${formatWhen12h(event.start, event.end)}`).join(", ");
  const needsResponse = meetings.filter((event) => event.responseStatus && event.responseStatus !== "accepted");
  const shortContext = needsResponse.length === 0 ? `${meetings.length} timed meetings. All accepted.` : `${needsResponse.length} invite${needsResponse.length === 1 ? "" : "s"} need response.`;
  return {
    shortContext,
    expandedContext: `${meetingText}. ${needsResponse.length === 0 ? "All timed meetings are accepted." : `${formatNames(needsResponse.map((event) => event.title))} ${needsResponse.length === 1 ? "needs" : "need"} response.`}`,
  };
}

function summarizeEmail(emails: EmailItem[]): BriefContext {
  if (emails.length === 0) return { shortContext: "No important unread emails found.", expandedContext: "No unread inbox emails matched the important-email filter." };

  const loginCodes = emails.filter((email) => /login code|verification code/i.test(email.subject));
  const linear = emails.filter((email) => /linear/i.test(email.subject) || /linear/i.test(email.from));
  const others = Math.max(0, emails.length - loginCodes.length - linear.length);
  const lines: BriefContext[] = [];

  if (loginCodes.length > 0) {
    lines.push({
      shortContext: `${loginCodes.length} login-code email${loginCodes.length === 1 ? "" : "s"} unread.`,
      expandedContext: `${loginCodes.length === 1 ? "An unread login-code email is" : "Unread login-code emails are"} present. Review only if the login was unexpected: ${loginCodes.map((email) => email.subject).join(", ")}.`,
    });
  }
  if (linear.length > 0) {
    lines.push({
      shortContext: `${linear.length} Linear email${linear.length === 1 ? "" : "s"} need a glance.`,
      expandedContext: `${linear.length === 1 ? "One Linear email needs" : `${linear.length} Linear emails need`} a quick glance: ${linear.map((email) => email.subject).join(", ")}.`,
    });
  }
  if (others > 0) {
    lines.push({
      shortContext: `${others} other unread email${others === 1 ? "" : "s"}.`,
      expandedContext: `${others} other unread ${others === 1 ? "email looks" : "emails look"} lower-priority based on sender and subject.`,
    });
  }

  return combineEmailContexts(lines);
}

function summarizeLinear(issues: LinearIssue[]) {
  if (issues.length === 0) return { shortContext: "No active assigned issues found.", expandedContext: "No active assigned Linear issues were returned for today." };

  const urgent = issues.filter((issue) => issue.priority <= 1).slice(0, 2);
  const inReview = issues.filter((issue) => /review/i.test(issue.state?.name || "")).slice(0, 3);
  const parts: string[] = [];

  if (urgent.length > 0) {
    parts.push(`${formatNames(urgent.map((issue) => issue.identifier))} ${urgent.length === 1 ? "is" : "are"} urgent`);
  }
  if (inReview.length > 0) {
    parts.push(`${formatNames(inReview.map((issue) => issue.identifier))} ${inReview.length === 1 ? "is" : "are"} in review`);
  }

  return {
    shortContext: parts.length > 0 ? parts.join("; ") : `${issues.length} active assigned ${issues.length === 1 ? "issue" : "issues"}.`,
    expandedContext: issues.slice(0, 8).map((issue) => `- ${issue.identifier}: ${issue.title} (${issue.state?.name || "Unknown"}, ${issue.priorityLabel || "No priority"})`).join("\n"),
  };
}

function summarizeAttention(data: BriefData) {
  const needsResponse = data.calendar.filter((event) => !isAllDay(event) && event.responseStatus && event.responseStatus !== "accepted");
  const urgent = data.linear.filter((issue) => issue.priority <= 1);
  const hasLoginCode = data.emails.some((email) => /login code|verification code/i.test(email.subject));
  const hasLinearSecurity = data.emails.some((email) => /api key|security alert/i.test(email.subject) && /linear/i.test(`${email.from} ${email.subject}`));
  const parts: string[] = [];

  if (needsResponse.length > 0) parts.push(`respond to ${formatNames(needsResponse.map((event) => event.title))}`);
  if (urgent.length > 0) parts.push(`prioritize ${formatNames(urgent.slice(0, 2).map((issue) => issue.identifier))}`);
  if (hasLinearSecurity) parts.push("verify the Linear API key email");
  if (hasLoginCode) parts.push("verify login-code emails were expected");

  return {
    shortContext: parts.length > 0 ? parts.join(", ") : "Nothing urgent.",
    expandedContext: parts.length > 0 ? `${parts.join(", ")}.` : "Nothing urgent was found across calendar responses, urgent Linear issues, or important unread email.",
  };
}

function buildSummaryDetailMarkdown(item: BriefLine, data: BriefData) {
  if (item.label === "calendar") return buildCalendarGlance(data.calendar);
  if (item.label === "email") return buildEmailGlance(data.emails);
  if (item.label === "linear") return buildLinearGlance(data.linear);
  if (item.label === "attention") return buildAttentionGlance(data);
  return [`# ${escapeMarkdown(item.heading)}`, item.context.expandedContext].filter(Boolean).join("\n\n");
}

function buildCalendarGlance(events: CalendarEvent[]) {
  const timed = events.filter((event) => !isAllDay(event));
  const allDay = events.filter(isAllDay);
  const needsResponse = timed.filter((event) => event.responseStatus && event.responseStatus !== "accepted");
  const status = needsResponse.length === 0 ? "All timed meetings accepted." : `${needsResponse.length} invite${needsResponse.length === 1 ? "" : "s"} need response.`;
  const lines = [
    "# Calendar",
    `**${timed.length} timed meeting${timed.length === 1 ? "" : "s"}**. ${status}`,
    "",
    "## Timeline",
    ...timed.map((event) => `- **${formatWhen(event.start, event.end)}** ${escapeMarkdown(event.title)}${event.responseStatus ? ` - ${escapeMarkdown(event.responseStatus)}` : ""}`),
  ];

  if (allDay.length > 0) {
    lines.push("", "## All day", ...allDay.map((event) => `- ${escapeMarkdown(event.title)}`));
  }

  if (timed.length === 0 && allDay.length === 0) lines.push("- No calendar events found.");
  return lines.join("\n");
}

function buildEmailGlance(emails: EmailItem[]) {
  const loginCodes = emails.filter((email) => /login code|verification code/i.test(email.subject));
  const apiKeys = emails.filter((email) => /api key|security alert/i.test(email.subject));
  const other = emails.filter((email) => !loginCodes.includes(email) && !apiKeys.includes(email));
  const lines = [
    "# Email",
    `**${emails.length} important unread email${emails.length === 1 ? "" : "s"}**`,
    "",
    "## Needs a security check",
  ];

  if (apiKeys.length === 0 && loginCodes.length === 0) lines.push("- No security-code or API-key alerts detected.");
  for (const email of apiKeys) lines.push(`- **API key:** ${escapeMarkdown(email.subject)} (${escapeMarkdown(cleanSender(email.from))})`);
  for (const email of loginCodes) lines.push(`- **Login code:** ${escapeMarkdown(email.subject)} (${escapeMarkdown(cleanSender(email.from))})`);

  if (other.length > 0) {
    lines.push("", "## Other unread", ...other.slice(0, 5).map((email) => `- ${escapeMarkdown(email.subject)} (${escapeMarkdown(cleanSender(email.from))})`));
  }

  lines.push("", "## Action", "- Verify these were initiated by you before ignoring them.");
  return lines.join("\n");
}

function buildLinearGlance(issues: LinearIssue[]) {
  const urgent = issues.filter((issue) => issue.priority <= 1);
  const byState = groupBy(issues, (issue) => issue.state?.name || "Unknown");
  const lines = [
    "# Linear",
    `**${issues.length} active issue${issues.length === 1 ? "" : "s"}**${urgent.length > 0 ? `, **${urgent.length} urgent**` : ""}`,
  ];

  if (urgent.length > 0) {
    lines.push("", "## Do first", ...urgent.map((issue) => `- **${issue.identifier}** ${escapeMarkdown(issue.title)} (${escapeMarkdown(issue.state?.name || "Unknown")})`));
  }

  for (const [state, stateIssues] of Object.entries(byState)) {
    lines.push("", `## ${escapeMarkdown(state)}`, ...stateIssues.slice(0, 6).map((issue) => `- **${issue.identifier}** ${escapeMarkdown(issue.title)}${issue.priorityLabel ? ` - ${escapeMarkdown(issue.priorityLabel)}` : ""}`));
  }

  if (issues.length === 0) lines.push("", "- No active assigned issues found.");
  return lines.join("\n");
}

function buildAttentionGlance(data: BriefData) {
  const needsResponse = data.calendar.filter((event) => !isAllDay(event) && event.responseStatus && event.responseStatus !== "accepted");
  const urgent = data.linear.filter((issue) => issue.priority <= 1);
  const loginCodes = data.emails.filter((email) => /login code|verification code/i.test(email.subject));
  const apiKeys = data.emails.filter((email) => /api key|security alert/i.test(email.subject));
  const actions = [
    ...needsResponse.map((event) => `Respond to ${escapeMarkdown(event.title)}.`),
    ...urgent.slice(0, 3).map((issue) => `Clear **${issue.identifier}**: ${escapeMarkdown(issue.title)}.`),
    ...apiKeys.map((email) => `Verify API-key alert: ${escapeMarkdown(email.subject)}.`),
    ...loginCodes.map((email) => `Verify login-code email: ${escapeMarkdown(email.subject)}.`),
  ];

  return [
    "# Attention today",
    actions.length > 0 ? `**${actions.length} thing${actions.length === 1 ? "" : "s"} need attention.**` : "**Nothing urgent found.**",
    "",
    "## Action list",
    ...(actions.length > 0 ? actions.map((action) => `- [ ] ${action}`) : ["- No urgent action found."]),
  ].join("\n");
}

function cleanSender(value: string) {
  return value.replace(/\s*<[^>]+>\s*/g, "").replace(/^"|"$/g, "").trim() || value;
}

function groupBy<T>(items: T[], getKey: (item: T) => string) {
  return items.reduce<Record<string, T[]>>((groups, item) => {
    const key = getKey(item);
    groups[key] = groups[key] || [];
    groups[key].push(item);
    return groups;
  }, {});
}

function escapeMarkdown(value: string) {
  return value.replace(/([\\`*_{}[\]()#+\-.!|>])/g, "\\$1");
}

function formatWhen12h(start: string, end: string) {
  if (!start || !end) return formatWhen(start, end);
  if (isDateOnly(start)) return "all day";
  return `${formatTime12h(start)}-${formatTime12h(end)}`;
}

function formatTime12h(value: string) {
  const hour = Number(value.slice(11, 13));
  const minute = value.slice(14, 16);
  if (Number.isNaN(hour)) return value.slice(11, 16);
  const suffix = hour >= 12 ? "PM" : "AM";
  const normalized = hour % 12 || 12;
  return `${normalized}:${minute} ${suffix}`;
}

function formatNames(names: string[]) {
  if (names.length <= 1) return names[0] || "";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names.at(-1)}`;
}

function isAllDay(event: CalendarEvent) {
  return isDateOnly(event.start);
}

function isDateOnly(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}
