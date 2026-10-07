import { LocalStorage, getPreferenceValues } from "@raycast/api";
import { XMLParser } from "fast-xml-parser";

// Spec: https://www.qrz.com/docs/xml/current_spec.html
const API_URL = "https://xmldata.qrz.com/xml/current/";
const AGENT = "raycast-qrz-lookup-1.0";

const parser = new XMLParser({ parseTagValue: false });

export interface Callsign {
  call: string;
  fname?: string;
  name?: string;
  nickname?: string;
  addr1?: string;
  addr2?: string;
  state?: string;
  zip?: string;
  country?: string;
  grid?: string;
  class?: string;
  email?: string;
  image?: string;
  cqzone?: string;
  ituzone?: string;
  lotw?: string;
  eqsl?: string;
  mqsl?: string;
}

interface Response {
  Session: { Key?: string; Error?: string };
  Callsign?: Callsign;
}

async function request(params: Record<string, string>): Promise<Response> {
  const response = await fetch(`${API_URL}?${new URLSearchParams(params)}`);
  if (!response.ok) throw new Error(`QRZ.com responded with ${response.status}`);
  return parser.parse(await response.text()).QRZDatabase;
}

async function login({ username, password }: Preferences): Promise<string> {
  const { Session } = await request({ username, password, agent: AGENT });
  if (!Session.Key) throw new Error(Session.Error ?? "Login failed");
  await LocalStorage.setItem(`sessionKey:${username}`, Session.Key);
  return Session.Key;
}

export async function lookupCallsign(callsign: string): Promise<Callsign | undefined> {
  const preferences = getPreferenceValues<Preferences>();
  const sessionKey =
    (await LocalStorage.getItem<string>(`sessionKey:${preferences.username}`)) ?? (await login(preferences));
  let result = await request({ s: sessionKey, callsign });
  if (!result.Session.Key) result = await request({ s: await login(preferences), callsign });

  const error = result.Session.Error;
  if (error?.startsWith("Not found")) return undefined;
  if (error) throw new Error(error);
  return result.Callsign;
}
