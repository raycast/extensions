import { getPreferenceValues, Toast } from "@raycast/api";
import { createSocket } from "dgram";

export interface Preferences {
  haUrl: string;
  haToken: string;
  entityId: string;
  hasProjector: boolean;
  projectorEntityId: string;
  projectorMac: string;
}

let _prefs: Preferences | null = null;
export function prefs(): Preferences {
  if (!_prefs) _prefs = getPreferenceValues<Preferences>();
  return _prefs;
}

async function haFetch(path: string, init?: RequestInit) {
  const p = prefs();
  const base = p.haUrl.replace(/\/+$/, "");
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${p.haToken}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HA ${res.status}: ${text.slice(0, 200)}`);
  }
  return res;
}

export async function callHAService(domain: string, service: string, data: Record<string, unknown>) {
  return haFetch(`/api/services/${domain}/${service}`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

async function getState(entityId: string): Promise<string> {
  const res = await haFetch(`/api/states/${entityId}`);
  const json = (await res.json()) as { state: string };
  return json.state;
}

async function isOff(entityId: string): Promise<boolean> {
  try {
    const state = await getState(entityId);
    return state === "off" || state === "standby" || state === "unavailable";
  } catch {
    return true;
  }
}

function parseMac(mac: string): Buffer {
  const hex = mac.replace(/[^0-9a-fA-F]/g, "");
  if (hex.length !== 12) throw new Error(`Invalid MAC: ${mac}`);
  return Buffer.from(hex, "hex");
}

function sendWol(mac: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const macBuf = parseMac(mac);
    const packet = Buffer.alloc(6 + 16 * 6);
    packet.fill(0xff, 0, 6);
    for (let i = 0; i < 16; i++) macBuf.copy(packet, 6 + i * 6);

    const socket = createSocket("udp4");
    let done = false;
    const finish = (err?: Error | null) => {
      if (done) return;
      done = true;
      socket.close();
      if (err) reject(err);
      else resolve();
    };

    socket.on("error", (err) => finish(err));
    socket.bind(0, () => {
      socket.setBroadcast(true);
      socket.send(packet, 9, "255.255.255.255", (err) => finish(err));
    });
  });
}

type ProgressFn = (msg: string) => void;

async function wakeProjector(update: ProgressFn): Promise<boolean> {
  const p = prefs();
  if (!p.hasProjector) return false;

  const off = await isOff(p.projectorEntityId);
  if (!off) return false;

  update("Turning On Projector…");
  await sendWol(p.projectorMac);
  await new Promise((r) => setTimeout(r, 5000));
  return true;
}

async function wakeFireTV(projectorWasOff: boolean, update: ProgressFn) {
  const p = prefs();
  const tvOff = await isOff(p.entityId);

  if (tvOff) {
    update(projectorWasOff ? "Waking Fire TV + Projector…" : "Waking Fire TV…");
    await callHAService("androidtv", "adb_command", {
      entity_id: p.entityId,
      command: "input keyevent 26",
    });
    await new Promise((r) => setTimeout(r, 3000));
  } else if (projectorWasOff) {
    update("Reconnecting Fire TV to Projector…");
    await callHAService("androidtv", "adb_command", {
      entity_id: p.entityId,
      command: "input keyevent 3",
    });
    await new Promise((r) => setTimeout(r, 1000));
  } else {
    await callHAService("media_player", "turn_on", { entity_id: p.entityId });
    await new Promise((r) => setTimeout(r, 500));
  }
}

export async function wakeAndCast(toast: Toast, intentCmd: string) {
  const update = (msg: string) => {
    toast.message = msg;
  };

  const projWasOff = await wakeProjector(update);
  await wakeFireTV(projWasOff, update);
  await callHAService("androidtv", "adb_command", {
    entity_id: prefs().entityId,
    command: intentCmd,
  });
}
