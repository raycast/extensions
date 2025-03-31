import { OAuth } from "@raycast/api";
import { getAccessToken, OAuthService, showFailureToast } from "@raycast/utils";
import fetch from "node-fetch";
import { BasecampProject, BasecampTodo, TodoList, BasecampComment, BasecampPerson } from "../utils/types";
import { markdownToHtml } from "../utils/markdown";
import { getFromCache, saveToCache, CACHE_KEYS } from "../utils/cache";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.AppURI,
  providerName: "Basecamp",
  providerIcon: "basecamp-logo.png",
  providerId: "basecamp",
  description: "Connect your Basecamp account",
});

// Authorization
export const basecamp = new OAuthService({
  client,
  clientId: "072b1d92df5426e3b05814825d8277bdb7656986",
  authorizeUrl:
    "https://oauth.raycast.com/v1/authorize/Yu5bylqUnHj-jHAkK4iRGFKxrV_ObMQz4TEPVf4zHD3UxkB9A2WIdhPF18B4B76kimV7t1ks7MZQE2wqKh6Zc9MVsxKqVB2CLZvhZfnkTBzRu1YXFn9EXbPJz0602roPZLt6p_x-PWbvi5OG8JIaZFkyiqbnkVE",
  tokenUrl:
    "https://oauth.raycast.com/v1/token/wMaXr3BdE5QWGZQ_RE_7GyB37_wTuBYOg_9C7CxiqtwHYOELsCyxDKiOshV4mPWXj9NZ_cZ9-dLIkELMnqbN08GDHCnmBp0i2Z950v2kWuOU88VMf3YxkiQAxj5HiAGYW9ceuj9hTDeIBYyBIXciFpDsR6WPhJAjJsHqvz2j8IQQe28efSJFi18",
  refreshTokenUrl:
    "https://oauth.raycast.com/v1/refresh-token/zUVueWjJBw5e_3E04mUmut6L1LiT8fa6FdubGOtITFX_Gx3nilkwNIUISui62gZbvu6yXqDWHy7UKdM9R5RXPUQu-9q-zEsgnK2NhTktNwp2wmGT60Rg-mXFUUd_jg4fwBzIXj5cOBculalOYYodpTWi8bJJBp60XCxA_0C4hctAhKftD8soF-A",
  scope: "",
  extraParameters: {
    type: "web_server",
  },
});

export async function fetchAccounts(forceRefresh = false) {
  // Try to get from cache first if not forcing refresh
  if (!forceRefresh) {
    const cachedAccounts = await getFromCache<{ id: number; name: string }[]>(CACHE_KEYS.ACCOUNTS);
    if (cachedAccounts) {
      return cachedAccounts;
    }
  }

  const { token } = getAccessToken();

  const response = await fetch(`https://launchpad.37signals.com/authorization.json`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("Rate limit exceeded");
    }
    throw new Error("HTTP error " + response.status);
  }

  const json = (await response.json()) as { identity: { id: string }; accounts: { id: number; name: string }[] };

  // Save to cache
  await saveToCache(CACHE_KEYS.ACCOUNTS, json.accounts);

  return json.accounts;
}

interface PaginationResponse<T> {
  data: T[];
  nextPage: string | null;
  totalCount: number;
}

async function makeRequest<T>(url: string, token: string): Promise<PaginationResponse<T>> {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("HTTP error " + response.status);
  }

  const linkHeader = response.headers.get("Link");
  const totalCount = parseInt(response.headers.get("X-Total-Count") || "0", 10);

  // Parse the "next" link from Link header
  const nextPage =
    linkHeader
      ?.split(",")
      .find((link) => link.includes('rel="next"'))
      ?.match(/<(.+?)>/)?.[1] || null;

  const data = (await response.json()) as T[];

  return {
    data,
    nextPage,
    totalCount,
  };
}

export async function fetchProjects(accountId: string, page: number, forceRefresh = false) {
  // Try to get from cache first if page is 1 and not forcing refresh
  if (page === 1 && !forceRefresh) {
    const cachedProjects = await getFromCache<PaginationResponse<BasecampProject>>(CACHE_KEYS.PROJECTS(accountId));
    if (cachedProjects) {
      return cachedProjects;
    }
  }

  const { token } = getAccessToken();
  const url = `https://3.basecampapi.com/${accountId}/projects.json?page=${page}`;

  const result = await makeRequest<BasecampProject>(url, token);

  // Save to cache if it's the first page
  if (page === 1) {
    await saveToCache(CACHE_KEYS.PROJECTS(accountId), result);
  }

  return result;
}

export async function fetchTodoLists(accountId: string, projectId: number, todosetId: number, page: number) {
  const { token } = getAccessToken();
  const url =
    page === 1
      ? `https://3.basecampapi.com/${accountId}/buckets/${projectId}/todosets/${todosetId}/todolists.json`
      : `https://3.basecampapi.com/${accountId}/buckets/${projectId}/todosets/${todosetId}/todolists.json?page=${page}`;

  return makeRequest<TodoList>(url, token);
}

export async function fetchTodosFromList(accountId: string, projectId: number, todoListId: number, page: number) {
  const { token } = getAccessToken();
  const url =
    page === 1
      ? `https://3.basecampapi.com/${accountId}/buckets/${projectId}/todolists/${todoListId}/todos.json`
      : `https://3.basecampapi.com/${accountId}/buckets/${projectId}/todolists/${todoListId}/todos.json?page=${page}`;

  return makeRequest<BasecampTodo>(url, token);
}

export async function fetchComments(commentsUrl: string) {
  const { token } = getAccessToken();

  const response = await fetch(commentsUrl, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    throw new Error("HTTP error " + response.status);
  }

  const json = (await response.json()) as BasecampComment[];
  return json;
}

export async function markComplete(accountId: string, projectId: number, todoId: number) {
  const { token } = getAccessToken();

  const completionUrl = `https://3.basecampapi.com/${accountId}/buckets/${projectId}/todos/${todoId}/completion.json`;

  const response = await fetch(completionUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    console.error({ status: response.status, statusText: response.statusText });
    throw new Error("Failed to complete todo");
  }

  // API returns 204 No Content
  return;
}

export async function postComment(commentsUrl: string, content: string): Promise<BasecampComment> {
  const { token } = await getAccessToken();

  const response = await fetch(commentsUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      content: markdownToHtml(content),
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to post comment: ${response.statusText}`);
  }

  const data = await response.json();

  // Type guard function to verify the response matches BasecampComment shape
  function isBasecampComment(obj: unknown): obj is BasecampComment {
    return (
      obj !== null &&
      typeof obj === "object" &&
      "id" in obj &&
      "status" in obj &&
      "visible_to_clients" in obj &&
      "created_at" in obj &&
      "updated_at" in obj &&
      "title" in obj &&
      "inherits_status" in obj &&
      "type" in obj &&
      "url" in obj &&
      "app_url" in obj &&
      "bookmark_url" in obj &&
      "parent" in obj &&
      "bucket" in obj &&
      "creator" in obj &&
      "content" in obj
    );
  }

  if (!isBasecampComment(data)) {
    throw new Error("Invalid response format from Basecamp API");
  }

  return data;
}

interface CreateTodoParams {
  content: string;
  description?: string;
  assignee_ids?: number[];
  completion_subscriber_ids?: number[];
  notify?: boolean;
  due_on?: string;
  starts_on?: string;
}

export async function createTodo(accountId: string, projectId: number, todoListId: number, params: CreateTodoParams) {
  const response = await fetch(
    `https://3.basecampapi.com/${accountId}/buckets/${projectId}/todolists/${todoListId}/todos.json`,
    {
      method: "POST",
      headers: await getHeaders(),
      body: JSON.stringify({
        ...params,
        description: params.description ? markdownToHtml(params.description) : undefined,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to create todo: ${response.statusText}`);
  }

  return response.json();
}

async function getHeaders() {
  const { token } = await getAccessToken();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function getProjectPeople(
  accountId: string,
  projectId: number,
  forceRefresh = false,
): Promise<BasecampPerson[]> {
  // Try to get from cache first if not forcing refresh
  if (!forceRefresh) {
    const cachedPeople = await getFromCache<BasecampPerson[]>(CACHE_KEYS.PEOPLE(accountId, projectId));
    if (cachedPeople) {
      return cachedPeople;
    }
  }

  const response = await fetch(`https://3.basecampapi.com/${accountId}/projects/${projectId}/people.json`, {
    headers: await getHeaders(),
  });
  if (!response.ok) {
    throw new Error("HTTP error " + response.status);
  }

  const people = (await response.json()) as BasecampPerson[];

  // Save to cache
  await saveToCache(CACHE_KEYS.PEOPLE(accountId, projectId), people);

  return people;
}

export async function trashTodo(accountId: string, projectId: number, todoId: number) {
  const trashUrl = `https://3.basecampapi.com/${accountId}/buckets/${projectId}/recordings/${todoId}/status/trashed.json`;

  const response = await fetch(trashUrl, {
    method: "PUT",
    headers: await getHeaders(),
  });

  if (!response.ok) {
    console.error({ status: response.status, statusText: response.statusText });
    throw new Error("Failed to trash todo");
  }

  // API returns 204 No Content
  return;
}

interface ScheduleMeetingParams {
  summary: string;
  description?: string;
  starts_at: string; // ISO 8601 format
  ends_at: string; // ISO 8601 format
  all_day?: boolean;
  notify?: boolean;
  participant_ids?: number[];
}

interface ScheduleMeetingResponse {
  id: number;
  status: string;
  created_at: string;
  updated_at: string;
  title: string;
  summary: string;
  description: string;
  starts_at: string;
  ends_at: string;
  all_day: boolean;
  url: string;
  app_url: string;
  bucket: {
    id: number;
    name: string;
    type: string;
  };
  creator: {
    id: number;
    name: string;
  };
  participants: Array<{
    id: number;
    name: string;
  }>;
}

export async function scheduleMeeting(
  accountId: string,
  projectId: number,
  scheduleId: number,
  params: ScheduleMeetingParams,
): Promise<ScheduleMeetingResponse> {
  try {
    const url = `https://3.basecampapi.com/${accountId}/buckets/${projectId}/schedules/${scheduleId}/entries.json`;

    const response = await fetch(url, {
      method: "POST",
      headers: await getHeaders(),
      body: JSON.stringify({
        ...params,
        description: params.description ? markdownToHtml(params.description) : undefined,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();

      throw new Error(`${response.status} ${response.statusText} ${errorText}`);
    }

    return response.json() as Promise<ScheduleMeetingResponse>;
  } catch (error) {
    await showFailureToast(error, {
      title: "Schedule meeting error",
    });
    throw error; // Re-throw the error to be handled by the caller
  }
}

export async function fetchSchedules(accountId: string, projectId: number) {
  const { token } = getAccessToken();

  try {
    // First, get the project details to find the tools
    const projectUrl = `https://3.basecampapi.com/${accountId}/projects/${projectId}.json`;

    const projectResponse = await fetch(projectUrl, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!projectResponse.ok) {
      throw new Error(`Failed to fetch project details: HTTP error ${projectResponse.status}`);
    }

    const project = (await projectResponse.json()) as BasecampProject;

    // Find the schedule tool in the dock
    const scheduleTool = project.dock.find((tool) => tool.name === "schedule");

    if (!scheduleTool) {
      return []; // Return empty array instead of throwing error
    }

    // Check if the schedule tool is enabled (active)
    if (!scheduleTool.enabled) {
      return []; // Return empty array for disabled schedules
    }

    // Extract the schedule ID from the URL
    // The URL format is typically like: https://3.basecampapi.com/{account_id}/buckets/{project_id}/schedules/{schedule_id}.json
    const scheduleIdMatch = scheduleTool.url.match(/\/schedules\/(\d+)\.json$/);
    if (!scheduleIdMatch) {
      console.error("Could not determine schedule ID from URL:", scheduleTool.url);
      return []; // Return empty array instead of throwing error
    }

    const scheduleId = scheduleIdMatch[1];

    // Now get the schedule details
    const scheduleUrl = `https://3.basecampapi.com/${accountId}/buckets/${projectId}/schedules/${scheduleId}.json`;

    const response = await fetch(scheduleUrl, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch schedule: HTTP error ${response.status}`);
      return []; // Return empty array instead of throwing error
    }

    const schedule = (await response.json()) as {
      id: number;
      title: string;
      url: string;
      app_url: string;
      status?: string;
    };

    // Only return the schedule if it's active
    // Basecamp doesn't have a direct "active" flag for schedules,
    // but we've already checked if the tool is enabled in the project
    return [
      {
        id: parseInt(scheduleId),
        title: schedule.title || "Project Schedule",
        url: schedule.url,
        app_url: schedule.app_url,
      },
    ];
  } catch (error) {
    console.error("Error in fetchSchedules:", error);
    return []; // Return empty array on any error
  }
}
