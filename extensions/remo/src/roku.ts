import { getPreferenceValues, LocalStorage, open, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import dgram from "node:dgram";

export type RokuApp = { id: string; name: string; type: string };
export type Device = { host: string; name: string; isOn: boolean };

async function http(
  host: string,
  path: string,
  method: "GET" | "POST" = "GET",
): Promise<string> {
  const res = await fetch(`http://${host}/${path}`, {
    method,
    signal: AbortSignal.timeout(3000),
  });
  if (!res.ok) throw new Error(`Roku answered ${res.status}`);
  return res.text();
}

function ssdp(timeout = 2000): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const sock = dgram.createSocket("udp4");
    const found = new Set<string>();
    let done = false;
    const finish = (err?: Error) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      try {
        sock.close();
      } catch {
        /* already closed */
      }
      if (err) reject(new Error(`Couldn’t search the network: ${err.message}`));
      else resolve([...found]);
    };
    const onSent = (err: Error | null) => {
      if (err) finish(err);
    };
    sock.on("error", (err) => finish(err));
    const msg = Buffer.from(
      'M-SEARCH * HTTP/1.1\r\nHost: 239.255.255.250:1900\r\nMan: "ssdp:discover"\r\nST: roku:ecp\r\nMX: 2\r\n\r\n',
    );
    sock.on("message", (m) => {
      const loc = /LOCATION:\s*http:\/\/([^/\r\n]+)/i.exec(m.toString());
      if (loc) found.add(loc[1]);
    });
    sock.bind(() => {
      sock.send(msg, 1900, "239.255.255.250", onSent);
      sock.send(msg, 1900, "239.255.255.250", onSent);
    });
    const timer = setTimeout(() => finish(), timeout);
  });
}

async function info(host: string): Promise<Device> {
  const xml = await http(host, "query/device-info");
  const get = (k: string) =>
    new RegExp(`<${k}>([^<]*)</${k}>`).exec(xml)?.[1] ?? "";
  return {
    host,
    name: get("user-device-name") || get("friendly-device-name") || "Roku",
    isOn: get("power-mode") === "PowerOn",
  };
}

/** Preference IP, else the cached device, else discovery (preferring a TV that is on). */
export async function device(): Promise<Device> {
  const { host } = getPreferenceValues<Preferences>();
  if (host?.trim()) {
    const h = host.includes(":") ? host.trim() : `${host.trim()}:8060`;
    return info(h);
  }
  const cached = await LocalStorage.getItem<string>("host");
  if (cached) {
    try {
      return await info(cached);
    } catch {
      /* rediscover */
    }
  }
  const hosts = await ssdp();
  const devices = (await Promise.allSettled(hosts.map(info)))
    .filter(
      (r): r is PromiseFulfilledResult<Device> => r.status === "fulfilled",
    )
    .map((r) => r.value);
  const pick = devices.find((d) => d.isOn) ?? devices[0];
  if (!pick) throw new Error("No Roku found on your network");
  await LocalStorage.setItem("host", pick.host);
  return pick;
}

export async function press(key: string) {
  const d = await device();
  await http(d.host, `keypress/${key}`, "POST");
  return d;
}

export async function keyDown(key: string) {
  const d = await device();
  await http(d.host, `keydown/${key}`, "POST");
}

export async function typeText(text: string) {
  const d = await device();
  for (const c of text)
    await http(d.host, `keypress/Lit_${encodeURIComponent(c)}`, "POST");
  return d;
}

export async function apps(): Promise<{ device: Device; apps: RokuApp[] }> {
  const d = await device();
  const xml = await http(d.host, "query/apps");
  const list = [
    ...xml.matchAll(
      /<app id="([^"]+)"[^>]*type="([^"]+)"[^>]*>([^<]*)<\/app>/g,
    ),
  ].map((m) => ({
    id: m[1],
    type: m[2],
    name: m[3].replace(/&amp;/g, "&"),
  }));
  return { device: d, apps: list };
}

export async function launch(id: string) {
  const d = await device();
  await http(d.host, `launch/${encodeURIComponent(id)}`, "POST");
  return d;
}

export async function power() {
  const d = await device();
  await http(d.host, `keypress/${d.isOn ? "PowerOff" : "PowerOn"}`, "POST");
  return !d.isOn;
}

/** Smart actions (search, deep links, Apple Intelligence) are handled by the Remo app. */
export async function viaRemo(path: string) {
  try {
    await open(`remo://${path}`);
  } catch {
    throw new Error(
      "This command needs the Remo Mac app. Install and open Remo, then try again.",
    );
  }
}

export async function run(
  label: string,
  fn: () => Promise<unknown>,
  failureTitle = "Couldn’t reach the TV",
) {
  try {
    await fn();
    await showHUD(label);
  } catch (e) {
    await showFailureToast(e, { title: failureTitle });
  }
}
