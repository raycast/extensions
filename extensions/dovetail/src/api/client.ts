import { endpoints } from "./endpoints";
import { Insight, Note } from "../types/dovetail";

async function fetchDovetail<T>(endpoint: keyof typeof endpoints, body?: any, token?: string): Promise<T> {
  const { path, method, schema } = endpoints[endpoint];
  const url = `https://dovetail.com/api${path}`;
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const res = await fetch(url, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = await res.json();
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    throw new Error("Invalid API response");
  }
  return parsed.data as T;
}

async function fetchDovetailDynamic<T>(endpoint: { path: string; method: string; schema: any }, body?: any, token?: string): Promise<T> {
  const { path, method, schema } = endpoint;
  const url = `https://dovetail.com/api${path}`;
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const res = await fetch(url, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = await res.json();
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    throw new Error("Invalid API response");
  }
  return parsed.data as T;
}

export async function getInsights(query: string, after?: string | null, token?: string) {
  const result = await fetchDovetail<typeof endpoints.insights.schema._type>(
    "insights",
    undefined,
    token
  );
  let insights = result.data as Insight[];
  if (query) {
    const q = query.toLowerCase();
    insights = insights.filter((i) => i.title.toLowerCase().includes(q));
  }
  return {
    insights,
    pageInfo: undefined,
  };
}

export async function getNotes(query: string, after?: string | null, token?: string) {
  const result = await fetchDovetail<typeof endpoints.notes.schema._type>(
    "notes",
    {
      query,
      limit: 100,
      after,
      filter: {
        notes: [
          {
            title: { contains: query },
          },
        ],
      },
    },
    token
  );
  return {
    notes: result.data.notes as Note[],
    pageInfo: result.data.pageInfo,
  };
}

export async function getContacts(query: string, after?: string | null, token?: string) {
  const result = await fetchDovetail<typeof endpoints.contacts.schema._type>(
    "contacts",
    undefined,
    token
  );
  let contacts = result.data;
  if (query) {
    const q = query.toLowerCase();
    contacts = contacts.filter(
      (c) => c.name && c.name.toLowerCase().includes(q)
    );
  }
  return {
    contacts,
    pageInfo: undefined,
  };
}

export async function getProjects(token?: string) {
  const result = await fetchDovetail<typeof endpoints.projects.schema._type>(
    "projects",
    undefined,
    token
  );
  return {
    projects: result.data.projects,
    pageInfo: result.data.pageInfo,
  };
}

export async function searchChannels(query: string, after?: string | null, token?: string) {
  const result = await fetchDovetail<any>(
    "insights",
    {
      query,
      limit: 100,
      after,
      filter: {
        channels: [
          {
            name: { contains: query },
          },
        ],
      },
    },
    token
  );
  return {
    channels: result.data.channels || [],
    pageInfo: result.data.pageInfo,
  };
}

export async function summarizeNotes(noteIds: string[], token?: string) {
  const result = await fetchDovetail<typeof endpoints.summarize.schema._type>(
    "summarize",
    { note_ids: noteIds },
    token
  );
  return result.data.summary;
}

export async function getContactDetails(contactId: string, token?: string) {
  const endpoint = endpoints.contactDetails;
  const result = await fetchDovetailDynamic<typeof endpoint.schema._type>(
    { path: endpoint.path(contactId), method: endpoint.method, schema: endpoint.schema },
    undefined,
    token
  );
  return result.data;
}

export async function getData(query: string, token?: string) {
  const result = await fetchDovetail<typeof endpoints.data.schema._type>(
    "data",
    undefined,
    token
  );
  let data = result.data as import("../types/dovetail").Data[];
  if (query) {
    const q = query.toLowerCase();
    data = data.filter((i) => i.title.toLowerCase().includes(q));
  }
  return { data };
}

export async function getDataExportMarkdown(dataId: string, token?: string): Promise<any> {
  const res = await fetch(
    `https://dovetail.com/api/v1/data/${dataId}/export/markdown`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  if (!res.ok) throw new Error("Failed to fetch data export");
  const json = await res.json();
  return json.data;
}

export async function getDataExportHtml(dataId: string, token?: string): Promise<string> {
  const res = await fetch(
    `https://dovetail.com/api/v1/data/${dataId}/export/html`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  if (!res.ok) throw new Error("Failed to fetch data export");
  return await res.text();
} 