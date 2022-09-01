import { getPreferenceValues, OAuth } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import axios, { AxiosRequestConfig, AxiosResponse } from "axios";

const CLIENT_ID = "KCCVj5CuqdSvGsCQFqzj1KpnWap4c17W1PAaIpeFbgE";
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

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Calendly",
  providerIcon: "logo.png",
  description: "Connect your Calendly account...",
});
export async function authorize() {
  const authRequest = await client.authorizationRequest({
    clientId: CLIENT_ID,
    endpoint: "https://auth.calendly.com/oauth/authorize",
    scope: "default",
  });
  return await client.authorize(authRequest);
}
export async function getToken({ authorizationCode }: OAuth.AuthorizationResponse) {
  const resp = await api.request({
    baseURL: "https://auth.calendly.com/oauth/token",
    method: "POST",
    data: {
      grant_type: "authorization_code",
      client_id: CLIENT_ID,
      client_secret: "KAv1FfPf-ykkBEM-WEcjOLi1bzW3BhbjdEk7wtqq7Zg",
      code: authorizationCode,
      redirect_uri: "https://raycast.com/redirect?packageName=calendly",
    },
  });
  console.log(resp.data);
}

const api = axios.create({
  baseURL: "https://api.calendly.com/",
  headers: { Authorization: `Bearer ${token}` },
});

async function calendlyAPI<T>({ method = "GET", ...props }: AxiosRequestConfig) {
  const resp = api.request<unknown, T>({ method, ...props });
  return resp;
}

export function useCurrentUser(): { user?: CalendlyUser; isLoading: boolean; error?: Error } {
  const { data, isLoading, error } = useCachedPromise(async () => {
    return (await calendlyAPI<CalendlyUserResource>({ url: "/users/me" })).data.resource;
  });
  return { user: data, isLoading, error };
}

export function useEventTypes(): { eventTypes: CalendlyEventType[]; isLoading: boolean; revalidate: () => void } {
  const { user } = useCurrentUser();
  const { data, isLoading, revalidate } = useCachedPromise(
    async () => {
      const data = await calendlyAPI<CalendlyEventTypeResponse>({
        url: `https://api.calendly.com/event_types`,
        params: { user: user?.uri },
      });
      return data.data.collection.filter((e) => e.active);
    },
    [],
    { initialData: [], execute: !!user }
  );
  return { eventTypes: data, isLoading, revalidate };
}

export async function createSingleUseLink(event: CalendlyEventType) {
  const data = await calendlyAPI<CalendlySingleUseLinkResponse>({
    url: "/scheduling_links",
    method: "POST",
    data: { max_event_count: 1, owner: event.uri, owner_type: "EventType" },
  });
  return data.data.resource;
}
