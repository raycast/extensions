import { getPreferenceValues } from "@raycast/api";

export type CreateTodoResponse = {
  id: string;
  text: string;
  done: boolean;
  projectSlugs: string[];
  imageKeys?: string[];
};

export type UploadedImage = {
  key: string;
  mimeType: string;
  sizeBytes: number;
};

export type Project = {
  slug: string;
  name: string;
  color: string;
  icon: string | null;
};

function authFetch(path: string, init: RequestInit = {}) {
  const { apiUrl, apiKey } = getPreferenceValues<Preferences>();
  const base = apiUrl.replace(/\/+$/, "");
  return fetch(`${base}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      "x-api-key": apiKey,
    },
  });
}

async function parseJsonResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${res.status}: ${body || res.statusText}`);
  }
  return (await res.json()) as T;
}

export async function createTodo(input: {
  text: string;
  done: boolean;
  images?: UploadedImage[];
}): Promise<CreateTodoResponse> {
  const res = await authFetch("/todos", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });

  return parseJsonResponse<CreateTodoResponse>(res);
}

export type PresignedUpload = {
  key: string;
  uploadUrl: string;
  publicUrl: string;
  mimeType: string;
  sizeBytes: number;
};

export async function presignUploads(files: { mimeType: string; sizeBytes: number }[]): Promise<PresignedUpload[]> {
  const res = await authFetch("/upload/presign", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ files }),
  });
  const data = await parseJsonResponse<{ uploads: PresignedUpload[] }>(res);
  return data.uploads;
}

export async function listProjects(): Promise<Project[]> {
  const res = await authFetch("/projects");
  const data = await parseJsonResponse<{ projects: Project[] }>(res);
  return data.projects;
}

export async function createProject(slug: string): Promise<Project> {
  const res = await authFetch("/projects", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ slug }),
  });
  return parseJsonResponse<Project>(res);
}
