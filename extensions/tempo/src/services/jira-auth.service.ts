import { getPreferenceValues, LocalStorage } from "@raycast/api";
import { JiraUser } from "../types/worklog";

interface Preferences {
  jiraEmail: string;
  jiraApiToken: string;
  jiraBaseUrl: string;
}

const ACCOUNT_ID_STORAGE_KEY_PREFIX = "jira-account-id-";

/**
 * Get the storage key for the account ID based on the user's email
 */
function getAccountIdStorageKey(email: string): string {
  return `${ACCOUNT_ID_STORAGE_KEY_PREFIX}${email}`;
}

/**
 * Get the Basic Authentication token for Jira API
 */
export function getJiraAuthToken(): string {
  const { jiraEmail, jiraApiToken } = getPreferenceValues<Preferences>();
  return Buffer.from(`${jiraEmail}:${jiraApiToken}`).toString("base64");
}

/**
 * Reset the cached account ID for the current user
 */
export async function resetCachedAccountId(): Promise<void> {
  const { jiraEmail } = getPreferenceValues<Preferences>();
  const storageKey = getAccountIdStorageKey(jiraEmail);
  await LocalStorage.removeItem(storageKey);
}

/**
 * Get the current user's Jira account ID by email (with caching)
 */
export async function getCurrentUserAccountId(): Promise<string> {
  const { jiraEmail, jiraBaseUrl } = getPreferenceValues<Preferences>();
  const storageKey = getAccountIdStorageKey(jiraEmail);

  // Try to get cached account ID
  const cachedAccountId = await LocalStorage.getItem<string>(storageKey);
  if (cachedAccountId) {
    return cachedAccountId;
  }

  // If not cached, fetch from API
  const authToken = getJiraAuthToken();

  try {
    const response = await fetch(`${jiraBaseUrl}/rest/api/3/user/search?query=${encodeURIComponent(jiraEmail)}`, {
      headers: {
        Authorization: `Basic ${authToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch user: ${response.status} - ${errorText}`);
    }

    const users: JiraUser[] = (await response.json()) as JiraUser[];

    if (!users || users.length === 0) {
      throw new Error(`No user found with email: ${jiraEmail}`);
    }

    // Find exact email match
    const user = users.find((u) => u.emailAddress === jiraEmail);
    if (!user) {
      throw new Error(`No exact match for email: ${jiraEmail}`);
    }

    // Cache the account ID
    await LocalStorage.setItem(storageKey, user.accountId);

    return user.accountId;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to get user account ID: ${error.message}`);
    }
    throw new Error("Failed to get user account ID: Unknown error");
  }
}
