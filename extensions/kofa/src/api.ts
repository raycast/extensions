import { getPreferenceValues } from "@raycast/api";

export type TaskColor =
  | "white"
  | "blue"
  | "green"
  | "coral"
  | "orange"
  | "purple";

export interface CreateTaskBody {
  title: string;
  notes: string | null;
  scheduled_date: string | null;
  color: TaskColor | null;
}

export class ApiError extends Error {
  constructor(
    public title: string,
    public detail?: string,
  ) {
    super(title);
  }
}

export async function createTask(body: CreateTaskBody): Promise<void> {
  const { apiToken, apiBaseUrl } = getPreferenceValues<Preferences.AddTask>();
  const base = (apiBaseUrl ?? "https://api.kofa.dev").replace(/\/$/, "");
  let res: Response;
  try {
    res = await fetch(`${base}/tasks`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw new ApiError(
      "Network error",
      e instanceof Error ? e.message : String(e),
    );
  }

  if (res.status === 401) {
    throw new ApiError(
      "Invalid token",
      "Check Kofa → Settings → Personal access tokens.",
    );
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new ApiError(`Kofa API error (${res.status})`, detail.slice(0, 200));
  }
}
