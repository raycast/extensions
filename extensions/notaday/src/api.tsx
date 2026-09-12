import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  Toast,
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";

export const API_BASE_URL = "https://api.notaday.com";

export type Entry = {
  id: string;
  title: string;
  description?: string;
  type: "task" | "journal" | "routine";
  timeClass?: "" | "due" | "completed";
  completed: boolean;
  backlog: boolean;
  connections: string[];
  channelId?: string;
  tagIds: string[];
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
  completionCount?: number;
  sortOrder?: number;
};

export type Channel = {
  id: string;
  name: string;
  description?: string;
  color: string;
  archived: boolean;
};

export type Tag = {
  id: string;
  name: string;
  color: string;
  archived: boolean;
};

export type ChannelFormValues = {
  name: string;
  description: string;
  color: string;
  archived: boolean;
};

export type TagFormValues = {
  name: string;
  color: string;
  archived: boolean;
};

export type EntryFormValues = {
  title: string;
  description: string;
  type: "task" | "routine";
  channelId: string;
  tagIds: string[];
  dueDate: Date | null;
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export function getApiToken() {
  const { apiToken } = getPreferenceValues<Preferences>();
  return apiToken.trim();
}

export function MissingApiToken() {
  return (
    <Detail
      markdown="## Add your Notaday API token\n\nNotaday needs an API token before Raycast can load your data."
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}

export function apiHeaders(apiToken: string) {
  return {
    Authorization: `Bearer ${apiToken}`,
    Accept: "application/json",
  };
}

export async function parseEntriesResponse(response: Response): Promise<Entry[]> {
  if (!response.ok) {
    throw new ApiError(await getErrorMessage(response), response.status);
  }

  const result = (await response.json()) as unknown;

  if (!Array.isArray(result)) {
    throw new Error("The Notaday API returned an unexpected response.");
  }

  return result as Entry[];
}

export async function parseEntryResponse(response: Response): Promise<Entry> {
  if (!response.ok) {
    throw new ApiError(await getErrorMessage(response), response.status);
  }

  return (await response.json()) as Entry;
}

export async function parseChannelsResponse(response: Response): Promise<Channel[]> {
  if (!response.ok) {
    throw new ApiError(await getErrorMessage(response), response.status);
  }

  const result = (await response.json()) as unknown;
  return Array.isArray(result) ? (result as Channel[]) : [];
}

export async function parseTagsResponse(response: Response): Promise<Tag[]> {
  if (!response.ok) {
    throw new ApiError(await getErrorMessage(response), response.status);
  }

  const result = (await response.json()) as unknown;
  return Array.isArray(result) ? (result as Tag[]) : [];
}

export async function createEntry(apiToken: string, values: EntryFormValues) {
  return writeEntry(`${API_BASE_URL}/entries`, "POST", apiToken, values);
}

export async function createChannel(apiToken: string, values: ChannelFormValues) {
  return writeResource<Channel>(`${API_BASE_URL}/channels`, "POST", apiToken, {
    name: values.name.trim(),
    description: values.description.trim(),
    color: normalizeColor(values.color, "#8fd3c7"),
    archived: values.archived,
  });
}

export async function updateChannel(apiToken: string, id: string, values: ChannelFormValues) {
  return writeResource<Channel>(`${API_BASE_URL}/channels/${id}`, "PATCH", apiToken, {
    name: values.name.trim(),
    description: values.description.trim(),
    color: normalizeColor(values.color, "#8fd3c7"),
    archived: values.archived,
  });
}

export async function deleteChannel(apiToken: string, id: string) {
  return deleteResource(apiToken, `${API_BASE_URL}/channels/${id}`);
}

export async function createTag(apiToken: string, values: TagFormValues) {
  return writeResource<Tag>(`${API_BASE_URL}/tags`, "POST", apiToken, {
    name: values.name.trim(),
    color: normalizeColor(values.color, "#8a8a8a"),
    archived: values.archived,
  });
}

export async function updateTag(apiToken: string, id: string, values: TagFormValues) {
  return writeResource<Tag>(`${API_BASE_URL}/tags/${id}`, "PATCH", apiToken, {
    name: values.name.trim(),
    color: normalizeColor(values.color, "#8a8a8a"),
    archived: values.archived,
  });
}

export async function deleteTag(apiToken: string, id: string) {
  return deleteResource(apiToken, `${API_BASE_URL}/tags/${id}`);
}

export async function updateEntry(apiToken: string, id: string, values: EntryFormValues) {
  return writeEntry(`${API_BASE_URL}/entries/${id}`, "PATCH", apiToken, values);
}

export async function toggleEntryState({
  apiToken,
  entryId,
  action,
  loadingTitle,
  successTitle,
  onSuccess,
}: {
  apiToken: string;
  entryId: string;
  action: "toggle-complete" | "toggle-backlog";
  loadingTitle: string;
  successTitle: string;
  onSuccess: () => void;
}) {
  const toast = await showToast({ style: Toast.Style.Animated, title: loadingTitle });

  try {
    const response = await fetch(`${API_BASE_URL}/entries/${entryId}/${action}`, {
      method: "PATCH",
      headers: apiHeaders(apiToken),
    });

    if (!response.ok) {
      throw new ApiError(await getErrorMessage(response), response.status);
    }

    toast.style = Toast.Style.Success;
    toast.title = successTitle;
    onSuccess();
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could not update entry";
    toast.message = error instanceof Error ? error.message : undefined;
  }
}

export async function getErrorMessage(response: Response) {
  try {
    const body = (await response.json()) as { message?: unknown; error?: unknown };
    const message =
      typeof body.message === "string" ? body.message : typeof body.error === "string" ? body.error : undefined;
    return message ?? `Notaday API request failed with status ${response.status}.`;
  } catch {
    return `Notaday API request failed with status ${response.status}.`;
  }
}

async function writeEntry(url: string, method: "POST" | "PATCH", apiToken: string, values: EntryFormValues) {
  if (!values.title.trim()) {
    throw new Error("Title is required");
  }

  const response = await fetch(url, {
    method,
    headers: {
      ...apiHeaders(apiToken),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: values.title.trim(),
      description: values.description.trim(),
      type: values.type,
      channelId: values.channelId || null,
      tagIds: values.tagIds,
      dueDate: values.dueDate?.toISOString() ?? null,
    }),
  });

  if (!response.ok) {
    throw new ApiError(await getErrorMessage(response), response.status);
  }

  return (await response.json()) as Entry;
}

async function writeResource<T>(
  url: string,
  method: "POST" | "PATCH",
  apiToken: string,
  body: Record<string, unknown>,
) {
  if (typeof body.name === "string" && !body.name.trim()) {
    throw new Error("Name is required");
  }

  const response = await fetch(url, {
    method,
    headers: {
      ...apiHeaders(apiToken),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new ApiError(await getErrorMessage(response), response.status);
  }

  return (await response.json()) as T;
}

async function deleteResource(apiToken: string, url: string) {
  const response = await fetch(url, {
    method: "DELETE",
    headers: apiHeaders(apiToken),
  });

  if (!response.ok) {
    throw new ApiError(await getErrorMessage(response), response.status);
  }
}

function normalizeColor(color: string, fallback: string) {
  const trimmedColor = color.trim();
  return /^#[0-9a-f]{6}$/i.test(trimmedColor) ? trimmedColor : fallback;
}
