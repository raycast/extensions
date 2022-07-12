import { getPreferenceValues, LocalStorage } from "@raycast/api";
import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import _ from "lodash";

export interface Preferences {
  token: string;
  defaultAction: "meeting" | "one-time";
}

export interface CalendlyUser {
  avatar_url: string;
  created_at: string;
  current_organization: string;
  email: string;
  name: string;
  scheduling_url: string;
  slug: string;
  timezone: string;
  updated_at: string;
  uri: string;
}
interface CalendlyUserResource extends AxiosResponse {
  data: {
    resource: CalendlyUser;
  };
}

export interface CalendlyEventType {
  active: boolean;
  color: string;
  created_at: string;
  description_html: string | null;
  description_plain: string | null;
  duration: number;
  internal_note: string | null;
  kind: "solo";
  name: string;
  pooling_type: string | null;
  scheduling_url: string;
  secret: boolean;
  slug: string;
  type: string;
  updated_at: string;
  uri: string;
}

export interface CalendlySingleUseLinkResponse extends AxiosResponse {
  data: { resource: { booking_url: string; owner?: string; owner_type?: string } };
}

interface CalendlyEventTypeResponse extends AxiosResponse {
  data: { collection: CalendlyEventType[] };
}

const { token }: Preferences = getPreferenceValues();

const api = axios.create({
  baseURL: "https://api.calendly.com/",
  headers: { Authorization: `Bearer ${token}` },
});

async function calendlyAPI<T>({ method = "GET", ...props }: AxiosRequestConfig) {
  const resp = api.request<unknown, T>({ method, ...props });
  return resp;
}

async function getCurrentUser(): Promise<CalendlyUser> {
  const data = await calendlyAPI<CalendlyUserResource>({ url: "/users/me" });
  const resource = data.data.resource;
  return resource;
}

async function getEventTypes() {
  const user = await getUserFromCache();
  const data = await calendlyAPI<CalendlyEventTypeResponse>({ url: "/event_types", params: { user: user.uri } });
  const collection = _.filter(data.data.collection, "active");
  return collection;
}

export async function refreshData() {
  const user = await getCurrentUser();
  LocalStorage.setItem("user", JSON.stringify(user));
  const eventTypes = await getEventTypes();
  LocalStorage.setItem("eventTypes", JSON.stringify(eventTypes));
  LocalStorage.setItem("updated_ts", new Date().toISOString());
}

export async function getUserFromCache(): Promise<CalendlyUser> {
  const cache = await LocalStorage.getItem("user");
  if (!cache) throw new Error("User not found in Cache");
  return JSON.parse(cache.toString());
}

export async function getEventTypesFromCache(): Promise<CalendlyEventType[]> {
  const cache = await LocalStorage.getItem("eventTypes");
  if (!cache) throw new Error("Event Types not found in Cache");
  return JSON.parse(cache.toString());
}

export async function createSingleUseLink(event: CalendlyEventType) {
  const data = await calendlyAPI<CalendlySingleUseLinkResponse>({
    url: "/scheduling_links",
    method: "POST",
    data: { max_event_count: 1, owner: event.uri, owner_type: "EventType" },
  });
  return data.data.resource;
}
