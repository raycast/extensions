import {
  DEFAULT_DURATION,
  DurationKey,
  expirationDate,
  gitlabClearAfter,
} from "./duration";
import { Prefs } from "./preferences";

export type ServiceKey = "slack" | "gitlab" | "github";

export const SERVICE_LABELS: Record<ServiceKey, string> = {
  slack: "Slack",
  gitlab: "GitLab",
  github: "GitHub",
};

export interface ApplyResult {
  service: ServiceKey;
  ok: boolean;
  error?: string;
}

const SLACK_FALLBACK_EMOJI = ":speech_balloon:";

async function postSlackStatus(
  token: string,
  emoji: string,
  text: string,
  expiresAt: Date | null = null,
): Promise<string | null> {
  const response = await fetch("https://slack.com/api/users.profile.set", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      profile: {
        status_text: text,
        status_emoji: emoji,
        // 0 = the status never expires (Slack convention)
        status_expiration: expiresAt
          ? Math.floor(expiresAt.getTime() / 1000)
          : 0,
      },
    }),
  });
  const data = (await response.json()) as { ok: boolean; error?: string };
  return data.ok ? null : (data.error ?? "unknown Slack error");
}

async function setSlackStatus(
  token: string,
  emoji: string,
  text: string,
  expiresAt: Date | null,
): Promise<void> {
  let error = await postSlackStatus(token, emoji, text, expiresAt);
  // Slack rejects emoji shortcodes it doesn't know. Retry with a safe default
  // so the status text still lands (GitLab/GitHub are more forgiving).
  if (
    error === "profile_status_set_failed_not_valid_emoji" &&
    emoji !== SLACK_FALLBACK_EMOJI
  ) {
    error = await postSlackStatus(token, SLACK_FALLBACK_EMOJI, text, expiresAt);
  }
  if (error) {
    throw new Error(error);
  }
}

async function setGitlabStatus(
  baseUrl: string,
  token: string,
  emoji: string,
  text: string,
  clearAfter: string | null,
): Promise<void> {
  // GitLab wants the emoji name without colons (e.g. "fire", not ":fire:")
  const emojiName = emoji.replace(/:/g, "");
  const payload: Record<string, string> = {
    emoji: emojiName,
    message: text,
  };
  // Omitting clear_status_after keeps the status until cleared manually.
  if (clearAfter) payload.clear_status_after = clearAfter;
  const response = await fetch(
    `${baseUrl.replace(/\/$/, "")}/api/v4/user/status`,
    {
      method: "PUT",
      headers: {
        "PRIVATE-TOKEN": token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );
  if (!response.ok) {
    throw new Error(`${response.status} ${await response.text()}`);
  }
}

async function setGithubStatus(
  token: string,
  emoji: string,
  text: string,
  expiresAt: Date | null,
): Promise<void> {
  const query = `
    mutation($emoji: String!, $message: String!, $expiresAt: DateTime) {
      changeUserStatus(input: {emoji: $emoji, message: $message, expiresAt: $expiresAt}) {
        status { emoji message expiresAt }
      }
    }
  `;
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      variables: {
        emoji,
        message: text,
        // null = the status never expires
        expiresAt: expiresAt?.toISOString() ?? null,
      },
    }),
  });
  const data = (await response.json()) as {
    errors?: Array<{ message: string }>;
  };
  if (!response.ok || data.errors) {
    const message =
      data.errors?.map((e) => e.message).join("; ") ?? response.statusText;
    throw new Error(message);
  }
}

async function clearGitlabStatus(
  baseUrl: string,
  token: string,
): Promise<void> {
  const response = await fetch(
    `${baseUrl.replace(/\/$/, "")}/api/v4/user/status`,
    {
      method: "PUT",
      headers: {
        "PRIVATE-TOKEN": token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ emoji: "", message: "" }),
    },
  );
  if (!response.ok) {
    throw new Error(`${response.status} ${await response.text()}`);
  }
}

async function clearGithubStatus(token: string): Promise<void> {
  // Empty input clears the GitHub profile status.
  const query = `mutation { changeUserStatus(input: {}) { status { message } } }`;
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });
  const data = (await response.json()) as {
    errors?: Array<{ message: string }>;
  };
  if (!response.ok || data.errors) {
    const message =
      data.errors?.map((e) => e.message).join("; ") ?? response.statusText;
    throw new Error(message);
  }
}

/**
 * Set the same status on the selected services. Each service is applied
 * independently — one failure never blocks the others. `duration` overrides
 * the default duration from preferences for this run.
 */
export async function applyStatus(
  services: ServiceKey[],
  emoji: string,
  text: string,
  prefs: Prefs,
  duration?: DurationKey,
): Promise<ApplyResult[]> {
  const key = duration ?? prefs.defaultDuration ?? DEFAULT_DURATION;
  const expiresAt = expirationDate(key);
  const clearAfter = gitlabClearAfter(key);
  const tasks = services.map(async (service): Promise<ApplyResult> => {
    try {
      switch (service) {
        case "slack":
          if (!prefs.slackToken)
            throw new Error("No Slack token in preferences");
          await setSlackStatus(prefs.slackToken, emoji, text, expiresAt);
          break;
        case "gitlab":
          if (!prefs.gitlabToken)
            throw new Error("No GitLab token in preferences");
          await setGitlabStatus(
            prefs.gitlabUrl,
            prefs.gitlabToken,
            emoji,
            text,
            clearAfter,
          );
          break;
        case "github":
          if (!prefs.githubToken)
            throw new Error("No GitHub token in preferences");
          await setGithubStatus(prefs.githubToken, emoji, text, expiresAt);
          break;
      }
      return { service, ok: true };
    } catch (error) {
      return {
        service,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });
  return Promise.all(tasks);
}

/**
 * Clear the status on the selected services. Each service is cleared
 * independently — one failure never blocks the others.
 */
export async function clearStatuses(
  services: ServiceKey[],
  prefs: Prefs,
): Promise<ApplyResult[]> {
  const tasks = services.map(async (service): Promise<ApplyResult> => {
    try {
      switch (service) {
        case "slack": {
          if (!prefs.slackToken)
            throw new Error("No Slack token in preferences");
          const error = await postSlackStatus(prefs.slackToken, "", "");
          if (error) throw new Error(error);
          break;
        }
        case "gitlab":
          if (!prefs.gitlabToken)
            throw new Error("No GitLab token in preferences");
          await clearGitlabStatus(prefs.gitlabUrl, prefs.gitlabToken);
          break;
        case "github":
          if (!prefs.githubToken)
            throw new Error("No GitHub token in preferences");
          await clearGithubStatus(prefs.githubToken);
          break;
      }
      return { service, ok: true };
    } catch (error) {
      return {
        service,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });
  return Promise.all(tasks);
}
