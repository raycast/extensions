import { LocalStorage, getPreferenceValues } from "@raycast/api";
import dgram from "node:dgram";

// --- SOAP ---

const SERVICES = {
  AVTransport: ["/MediaRenderer/AVTransport/Control", "urn:schemas-upnp-org:service:AVTransport:1"],
  RenderingControl: ["/MediaRenderer/RenderingControl/Control", "urn:schemas-upnp-org:service:RenderingControl:1"],
  GroupRenderingControl: [
    "/MediaRenderer/GroupRenderingControl/Control",
    "urn:schemas-upnp-org:service:GroupRenderingControl:1",
  ],
  ZoneGroupTopology: ["/ZoneGroupTopology/Control", "urn:schemas-upnp-org:service:ZoneGroupTopology:1"],
  DeviceProperties: ["/DeviceProperties/Control", "urn:schemas-upnp-org:service:DeviceProperties:1"],
} as const;

type Service = keyof typeof SERVICES;

const ERROR_MESSAGES: Record<string, string> = {
  "701": "Nothing loaded. Start music in the Sonos app first.",
  "711": "No further track available.",
  "800": "Not possible: this speaker is not the group coordinator.",
};

export class SonosError extends Error {
  constructor(
    public code: string | undefined,
    message: string,
  ) {
    super(message);
  }
}

export function unescapeXml(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, "&");
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function tag(xml: string, name: string): string | undefined {
  const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`));
  return m ? unescapeXml(m[1]) : undefined;
}

function attrs(s: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of s.matchAll(/([\w:]+)="([^"]*)"/g)) out[m[1]] = unescapeXml(m[2]);
  return out;
}

export async function soap(
  ip: string,
  service: Service,
  action: string,
  args: Record<string, string | number> = {},
): Promise<string> {
  const [path, urn] = SERVICES[service];
  const body = Object.entries(args)
    .map(([k, v]) => `<${k}>${escapeXml(String(v))}</${k}>`)
    .join("");
  const envelope =
    `<?xml version="1.0" encoding="utf-8"?><s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" ` +
    `s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/"><s:Body><u:${action} xmlns:u="${urn}">${body}</u:${action}></s:Body></s:Envelope>`;
  let res: Response;
  try {
    res = await fetch(`http://${ip}:1400${path}`, {
      method: "POST",
      headers: { "Content-Type": 'text/xml; charset="utf-8"', SOAPACTION: `"${urn}#${action}"` },
      body: envelope,
      signal: AbortSignal.timeout(4000),
    });
  } catch {
    throw new SonosError(undefined, `Speaker ${ip} is not reachable.`);
  }
  const text = await res.text();
  if (!res.ok) {
    const code = tag(text, "errorCode");
    throw new SonosError(code, (code && ERROR_MESSAGES[code]) ?? `Sonos error ${code ?? res.status} on ${action}.`);
  }
  return text;
}

// --- Discovery ---

function ssdpDiscover(timeoutMs = 2500): Promise<string | undefined> {
  return new Promise((resolve) => {
    const socket = dgram.createSocket("udp4");
    const done = (ip?: string) => {
      clearTimeout(timer);
      socket.close();
      resolve(ip);
    };
    const timer = setTimeout(() => done(undefined), timeoutMs);
    socket.on("message", (msg) => {
      const m = msg.toString().match(/LOCATION:\s*http:\/\/([\d.]+):1400/i);
      if (m) done(m[1]);
    });
    socket.on("error", () => done(undefined));
    const search = Buffer.from(
      'M-SEARCH * HTTP/1.1\r\nHOST: 239.255.255.250:1900\r\nMAN: "ssdp:discover"\r\nMX: 1\r\n' +
        "ST: urn:schemas-upnp-org:device:ZonePlayer:1\r\n\r\n",
    );
    socket.bind(() => {
      for (let i = 0; i < 2; i++) socket.send(search, 1900, "239.255.255.250");
    });
  });
}

async function fetchTopology(ip: string): Promise<string> {
  const xml = await soap(ip, "ZoneGroupTopology", "GetZoneGroupState");
  return tag(xml, "ZoneGroupState") ?? "";
}

// --- Topology ---

export interface Room {
  uuid: string;
  name: string;
  ip: string;
}

export interface Group {
  id: string;
  name: string;
  coordinator: Room;
  members: Room[];
}

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, "de");

function parseTopology(state: string): Group[] {
  const groups: Group[] = [];
  for (const g of state.matchAll(/<ZoneGroup\s([^>]*)>([\s\S]*?)<\/ZoneGroup>/g)) {
    const { Coordinator, ID } = attrs(g[1]);
    const members: Room[] = [];
    for (const m of g[2].matchAll(/<ZoneGroupMember\s([^>]*?)\/?>/g)) {
      const a = attrs(m[1]);
      if (a.Invisible === "1" || a.IsZoneBridge === "1") continue;
      const ip = a.Location?.match(/http:\/\/([\d.]+):/)?.[1];
      if (ip) members.push({ uuid: a.UUID, name: a.ZoneName, ip });
    }
    const coordinator = members.find((r) => r.uuid === Coordinator);
    if (!coordinator) continue;
    members.sort(byName);
    const name = members.length > 1 ? `${coordinator.name} + ${members.length - 1}` : coordinator.name;
    groups.push({ id: ID, name, coordinator, members });
  }
  return groups.sort((a, b) => byName(a.coordinator, b.coordinator));
}

const HOST_KEY = "lastHost";

export async function getGroups(): Promise<Group[]> {
  const { host } = getPreferenceValues<Preferences>();
  const candidates = [host?.trim(), await LocalStorage.getItem<string>(HOST_KEY)].filter(Boolean) as string[];
  for (const ip of candidates) {
    try {
      const groups = parseTopology(await fetchTopology(ip));
      if (groups.length) return groups;
    } catch {
      // try next candidate
    }
  }
  const found = await ssdpDiscover();
  if (!found) throw new SonosError(undefined, "No Sonos speakers found on the network.");
  const groups = parseTopology(await fetchTopology(found));
  await LocalStorage.setItem(HOST_KEY, found);
  return groups;
}

export function allRooms(groups: Group[]): Room[] {
  return groups.flatMap((g) => g.members).sort(byName);
}

// --- Playback & status ---

export type TransportState = "PLAYING" | "PAUSED_PLAYBACK" | "STOPPED" | "TRANSITIONING" | string;

export interface GroupStatus {
  state: TransportState;
  title?: string;
  artist?: string;
  album?: string;
  artUrl?: string;
  volume?: number;
  muted?: boolean;
}

export async function getTransportState(ip: string): Promise<TransportState> {
  return (
    tag(await soap(ip, "AVTransport", "GetTransportInfo", { InstanceID: 0 }), "CurrentTransportState") ?? "STOPPED"
  );
}

export async function getGroupStatus(group: Group): Promise<GroupStatus> {
  const ip = group.coordinator.ip;
  const [state, position, volume, muted] = await Promise.all([
    getTransportState(ip),
    soap(ip, "AVTransport", "GetPositionInfo", { InstanceID: 0 }).catch(() => ""),
    getGroupVolume(ip).catch(() => undefined),
    getGroupMute(ip).catch(() => undefined),
  ]);
  const status: GroupStatus = { state, volume, muted };
  const didl = tag(position, "TrackMetaData");
  if (didl && didl !== "NOT_IMPLEMENTED") {
    status.title = tag(didl, "r:streamContent") || tag(didl, "dc:title");
    status.artist = tag(didl, "dc:creator");
    status.album = tag(didl, "upnp:album");
    const art = tag(didl, "upnp:albumArtURI");
    if (art) status.artUrl = art.startsWith("http") ? art : `http://${ip}:1400${art}`;
  }
  return status;
}

export async function togglePlay(group: Group): Promise<"PLAYING" | "PAUSED"> {
  const ip = group.coordinator.ip;
  if ((await getTransportState(ip)) === "PLAYING") {
    await soap(ip, "AVTransport", "Pause", { InstanceID: 0 });
    return "PAUSED";
  }
  await soap(ip, "AVTransport", "Play", { InstanceID: 0, Speed: 1 });
  return "PLAYING";
}

export const next = (g: Group) => soap(g.coordinator.ip, "AVTransport", "Next", { InstanceID: 0 });
export const previous = (g: Group) => soap(g.coordinator.ip, "AVTransport", "Previous", { InstanceID: 0 });

// --- Volume ---

export async function getGroupVolume(ip: string): Promise<number> {
  return Number(tag(await soap(ip, "GroupRenderingControl", "GetGroupVolume", { InstanceID: 0 }), "CurrentVolume"));
}

export async function getGroupMute(ip: string): Promise<boolean> {
  return tag(await soap(ip, "GroupRenderingControl", "GetGroupMute", { InstanceID: 0 }), "CurrentMute") === "1";
}

export async function changeGroupVolume(group: Group, delta: number): Promise<number> {
  const ip = group.coordinator.ip;
  await soap(ip, "GroupRenderingControl", "SnapshotGroupVolume", { InstanceID: 0 });
  const target = Math.max(0, Math.min(100, (await getGroupVolume(ip)) + delta));
  await soap(ip, "GroupRenderingControl", "SetGroupVolume", { InstanceID: 0, DesiredVolume: target });
  return target;
}

export async function toggleGroupMute(group: Group): Promise<boolean> {
  const ip = group.coordinator.ip;
  const muted = !(await getGroupMute(ip));
  await soap(ip, "GroupRenderingControl", "SetGroupMute", { InstanceID: 0, DesiredMute: muted ? 1 : 0 });
  return muted;
}

export async function getRoomVolume(room: Room): Promise<number> {
  const xml = await soap(room.ip, "RenderingControl", "GetVolume", { InstanceID: 0, Channel: "Master" });
  return Number(tag(xml, "CurrentVolume"));
}

export async function setRoomVolume(room: Room, volume: number): Promise<void> {
  await soap(room.ip, "RenderingControl", "SetVolume", {
    InstanceID: 0,
    Channel: "Master",
    DesiredVolume: Math.max(0, Math.min(100, Math.round(volume))),
  });
}

// --- Grouping ---

export async function joinGroup(room: Room, group: Group): Promise<void> {
  await soap(room.ip, "AVTransport", "SetAVTransportURI", {
    InstanceID: 0,
    CurrentURI: `x-rincon:${group.coordinator.uuid}`,
    CurrentURIMetaData: "",
  });
}

export async function leaveGroup(room: Room): Promise<void> {
  await soap(room.ip, "AVTransport", "BecomeCoordinatorOfStandaloneGroup", { InstanceID: 0 });
}

export async function groupAll(groups: Group[], target: Group): Promise<void> {
  const rooms = allRooms(groups).filter((r) => !target.members.some((m) => m.uuid === r.uuid));
  for (const room of rooms) await joinGroup(room, target);
}

// --- Rename ---

export async function renameRoom(room: Room, newName: string): Promise<void> {
  const xml = await soap(room.ip, "DeviceProperties", "GetZoneAttributes");
  await soap(room.ip, "DeviceProperties", "SetZoneAttributes", {
    DesiredZoneName: newName,
    DesiredIcon: tag(xml, "CurrentIcon") ?? "",
    DesiredConfiguration: tag(xml, "CurrentConfiguration") ?? "",
    DesiredTargetRoomName: tag(xml, "CurrentTargetRoomName") ?? "",
  });
}

// --- Active group ---

/** The group the quick commands act on: the playing one, else the default room's, else the first. */
export async function getActiveGroup(groups?: Group[]): Promise<{ group: Group; groups: Group[] }> {
  groups ??= await getGroups();
  if (!groups.length) throw new SonosError(undefined, "No Sonos groups found.");
  const states = await Promise.all(groups.map((g) => getTransportState(g.coordinator.ip).catch(() => "STOPPED")));
  const playing = groups.find((_, i) => states[i] === "PLAYING");
  if (playing) return { group: playing, groups };
  const { defaultRoom } = getPreferenceValues<Preferences>();
  const wanted = defaultRoom?.trim().toLowerCase();
  const preferred = wanted && groups.find((g) => g.members.some((m) => m.name.toLowerCase() === wanted));
  return { group: preferred || groups[0], groups };
}

export function volumeStep(): number {
  const n = Number(getPreferenceValues<Preferences>().volumeStep);
  return Number.isFinite(n) && n > 0 ? n : 5;
}

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
