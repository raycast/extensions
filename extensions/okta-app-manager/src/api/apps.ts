import { adminBaseUrl, oktaFetch } from "./client";

export type OktaApp = {
  id: string;
  label?: string;
  status?: string;
  signOnMode?: string;
  name?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  settings?: any;
};

export function adminAppUrl(app: OktaApp): string | null {
  if (!app?.id) return null;
  if (!app?.name) return null;
  return `${adminBaseUrl()}/admin/app/${encodeURIComponent(app.name)}/instance/${encodeURIComponent(app.id)}/`;
}

export async function searchApps(query: string): Promise<OktaApp[]> {
  const q = encodeURIComponent(query);
  const path = `/api/v1/apps?filter=${encodeURIComponent('status eq "ACTIVE"')}&q=${q}&limit=50`;
  const data = await oktaFetch(path);
  if (!Array.isArray(data)) return [];
  return data as OktaApp[];
}

export async function getApp(appId: string): Promise<OktaApp> {
  return (await oktaFetch(`/api/v1/apps/${encodeURIComponent(appId)}`)) as OktaApp;
}

export async function putApp(appId: string, fullAppObject: OktaApp): Promise<OktaApp> {
  return (await oktaFetch(`/api/v1/apps/${encodeURIComponent(appId)}`, {
    method: "PUT",
    body: JSON.stringify(fullAppObject),
  })) as OktaApp;
}

export function getOidcRedirectUris(app: OktaApp): string[] {
  const a = app?.settings?.oauthClient?.redirect_uris;
  const b = app?.settings?.oauthClient?.redirectUris;
  const list = (Array.isArray(a) ? a : Array.isArray(b) ? b : []) as string[];
  return list.filter(Boolean);
}

export function setOidcRedirectUris(app: OktaApp, uris: string[]): OktaApp {
  if (!app.settings) app.settings = {};
  if (!app.settings.oauthClient) app.settings.oauthClient = {};
  app.settings.oauthClient.redirect_uris = uris;
  return app;
}

export type SamlFields = {
  ssoAcsUrl?: string;
  destination?: string;
  recipient?: string;
  audience?: string;
  defaultRelayState?: string;
};

export function getSamlFields(app: OktaApp): SamlFields {
  const s = app?.settings?.signOn || {};
  return {
    ssoAcsUrl: s.ssoAcsUrl || "",
    destination: s.destination || "",
    recipient: s.recipient || "",
    audience: s.audience || "",
    defaultRelayState: s.defaultRelayState || "",
  };
}

export function setSamlFields(app: OktaApp, fields: SamlFields): OktaApp {
  if (!app.settings) app.settings = {};
  if (!app.settings.signOn) app.settings.signOn = {};
  const s = app.settings.signOn;
  s.ssoAcsUrl = fields.ssoAcsUrl ?? s.ssoAcsUrl;
  s.destination = fields.destination ?? s.destination;
  s.recipient = fields.recipient ?? s.recipient;
  s.audience = fields.audience ?? s.audience;
  s.defaultRelayState = fields.defaultRelayState ?? s.defaultRelayState;
  return app;
}
