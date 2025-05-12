import { endpoints } from "./endpoints";
import { Insight, ApiResponse, ApiEndpoint, DataExport, Contact, Data } from "../types/dovetail";
import { z } from "zod";

async function fetchDovetail<T>(
  endpoint: keyof typeof endpoints,
  body?: Record<string, unknown>,
  token?: string,
): Promise<ApiResponse<T>> {
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
  const parsed = (schema as z.ZodType).safeParse(json);
  if (!parsed.success) {
    throw new Error("Invalid API response");
  }
  return parsed.data as ApiResponse<T>;
}

async function fetchDovetailDynamic<T>(
  endpoint: ApiEndpoint,
  body?: Record<string, unknown>,
  token?: string,
): Promise<ApiResponse<T>> {
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
  const parsed = (schema as z.ZodType).safeParse(json);
  if (!parsed.success) {
    throw new Error("Invalid API response");
  }
  return parsed.data as ApiResponse<T>;
}

export async function getInsights(query: string, token?: string) {
  const result = await fetchDovetail<Insight[]>("insights", undefined, token);
  let insights = result.data;
  if (query) {
    const q = query.toLowerCase();
    insights = insights.filter((i) => i.title.toLowerCase().includes(q));
  }
  return { data: insights };
}

export async function getContacts(query: string, token?: string) {
  const result = await fetchDovetail<Contact[]>("contacts", undefined, token);
  let contacts = result.data;
  if (query) {
    const q = query.toLowerCase();
    contacts = contacts.filter((c) => c.name && c.name.toLowerCase().includes(q));
  }
  return { data: contacts };
}

export async function getContactDetails(contactId: string, token?: string) {
  const endpoint = endpoints.contactDetails;
  const result = await fetchDovetailDynamic<Contact>(
    { path: endpoint.path(contactId), method: endpoint.method, schema: endpoint.schema },
    undefined,
    token,
  );
  return result.data;
}

export async function getData(query: string, token?: string) {
  const result = await fetchDovetail<Data[]>("data", undefined, token);
  let data = result.data;
  if (query) {
    const q = query.toLowerCase();
    data = data.filter((i) => i.title.toLowerCase().includes(q));
  }
  return { data };
}

export async function getDataExportMarkdown(dataId: string, token?: string): Promise<DataExport> {
  const res = await fetch(`https://dovetail.com/api/v1/data/${dataId}/export/markdown`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error("Failed to fetch data export");
  const json = await res.json();
  return json.data;
}

export async function getDataExportHtml(dataId: string, token?: string): Promise<string> {
  const res = await fetch(`https://dovetail.com/api/v1/data/${dataId}/export/html`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error("Failed to fetch data export");
  return await res.text();
}
