import { getPreferenceValues, OAuth } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";

const CLIENT_ID = "gNDd7abqwsU1vqG9d0JA2c-zUlbhyNT2o7QACkwlDEc";
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isAxiosError(error: any): error is AxiosError {
  return Object.keys(error).includes("isAxiosError");
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
  providerId: "calendly",
  providerName: "Calendly",
  providerIcon: "logo.png",
  description: "Connect your Calendly account...",
});
export async function authorize() {
  const tokenSet = await client.getTokens();
  if (tokenSet?.accessToken) {
    if (tokenSet.refreshToken && tokenSet.isExpired()) {
      await client.setTokens(await refreshTokens(tokenSet.refreshToken));
    }
    return;
  }

  const authRequest = await client.authorizationRequest({
    clientId: CLIENT_ID,
    endpoint: "https://auth.calendly.com/oauth/authorize",
    scope: "default",
  });
  const { authorizationCode } = await client.authorize(authRequest);

  await client.setTokens(await fetchTokens(authRequest, authorizationCode));
}
export async function fetchTokens(authRequest: OAuth.AuthorizationRequest, code: string) {
  console.log("trying to exchange for token");

  const resp = await axios
    .request<OAuth.TokenResponse>({
      url: "https://auth.calendly.com/oauth/token?",
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      params: {
        grant_type: "authorization_code",
        code,
        client_id: CLIENT_ID,
        code_verifier: authRequest.codeVerifier,
        redirect_uri: authRequest.redirectURI,
      },
    })
    .catch((e) => {
      if (isAxiosError(e)) {
        console.log(e.response?.data);
      }
      throw e;
    });

  return resp.data;
}

async function refreshTokens(refresh_token: string) {
  const resp = await api.request<OAuth.TokenResponse>({
    baseURL: "https://auth.calendly.com/oauth/token",
    method: "POST",
    data: {
      grant_type: "refresh_token",
      client_id: CLIENT_ID,
      refresh_token,
    },
  });
  return resp.data;
}

const api = axios.create({
  baseURL: "https://api.calendly.com/",
  headers: { Authorization: `Bearer ${token}` },
});

async function calendlyAPI<T>({ method = "GET", ...props }: AxiosRequestConfig) {
  const token = await client.getTokens();
  if (!token) {
    throw new Error("No token found");
  }
  const resp = api.request<unknown, T>({
    method,
    ...props,
    headers: { Authorization: `Bearer ${token.accessToken}` },
  });
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
        data: { count: 100 },
      });
      return data.data.collection.filter((e) => e.active);
    },
    [],
    { initialData: [], execute: !!user },
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
