import { getPreferenceValues } from "@raycast/api";

export interface Preferences {
  slackUserToken: string;
  slackPersonalChannel: string;
  slackBusinessChannel: string;
  language: string;
  jiraDomain?: string;
  jiraEmail?: string;
  jiraToken?: string;
  condition?: string;
  environment?: string;
  confluenceLimit?: string;
}

export async function sendSlackMessage(channel: string, text: string): Promise<boolean> {
  const preferences = getPreferenceValues<Preferences>();
  const token = preferences.slackUserToken;

  if (!channel || !text || !token) {
    console.error("Missing channel, text, or token");
    return false;
  }

  try {
    const response = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        channel,
        text,
      }),
    });

    if (!response.ok) {
      console.error(`Slack API error: ${response.statusText}`);
      return false;
    }

    const result = (await response.json()) as { ok: boolean; error?: string };
    if (!result.ok) {
      console.error(`Slack API error body: ${result.error}`);
    }
    return result.ok;
  } catch (error) {
    console.error("Error sending Slack message:", error);
    return false;
  }
}

export function getLanguage(): string {
  const preferences = getPreferenceValues<Preferences>();
  const lang = preferences.language;
  return ["en", "zh", "zh_TW", "ja", "geek"].includes(lang) ? lang : "en";
}

export interface WorkLogEntry {
  issue_key: string;
  time_spent: number;
  summary: string;
}

/**
 * Parses raw text input into a list of work log entries.
 * Expected format per line: [JIRA_KEY] [HOURS] [SUMMARY]
 * Example: JIRA-123 1.5 Implemented logic
 *
 * @param text - The raw text input, potentially valid for multiple lines
 * @returns Array of parsed WorkLogEntry objects
 */
export function parseWorkLog(text: string): WorkLogEntry[] {
  const workLogList: WorkLogEntry[] = [];
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line);

  for (const line of lines) {
    const parts = line.split(/\s+/);

    if (parts.length < 3) {
      continue;
    }

    const keyRaw = parts[0];
    const timeRaw = parts[1];
    const summary = parts.slice(2).join(" ");

    const timeSpent = parseFloat(timeRaw);
    if (isNaN(timeSpent)) {
      continue;
    }

    workLogList.push({
      issue_key: keyRaw.toUpperCase(),
      time_spent: timeSpent,
      summary: summary,
    });
  }

  return workLogList;
}

/**
 * Formats a list of work log entries into a daily report message.
 *
 * @param workLog - Array of work log entries
 * @param condition - Optional health/condition status
 * @param environment - Optional work environment status
 * @returns Formatted string for Slack
 */
export function buildDailyWorkLogMessage(workLog: WorkLogEntry[], condition?: string, environment?: string): string {
  const lines = ["【今日の作業内容】"];
  if (workLog.length === 0) {
    lines.push("No work log");
  } else {
    for (const item of workLog) {
      const issuePart = item.issue_key && item.issue_key !== "NONE" ? `${item.issue_key} ` : "";
      lines.push(` - ${issuePart}${item.summary} ${item.time_spent}h`);
    }
  }

  if (condition && condition.length > 0) {
    lines.push("【今日の体調】");
    lines.push(condition);
  }

  if (environment && environment.length > 0) {
    lines.push("【今日の作業環境】");
    lines.push(environment);
  }

  return "```\n" + lines.join("\n") + "\n```";
}
export function getJiraCredentials(preferences: Preferences) {
  const { jiraDomain, jiraEmail, jiraToken } = preferences;
  if (!jiraDomain || !jiraEmail || !jiraToken) {
    return null;
  }
  const baseUrl = jiraDomain.endsWith("/") ? jiraDomain.slice(0, -1) : jiraDomain;
  const auth = Buffer.from(`${jiraEmail}:${jiraToken}`).toString("base64");
  const headers = {
    Authorization: `Basic ${auth}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  return { baseUrl, headers };
}
