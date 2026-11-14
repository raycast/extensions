import { protocolLog } from "./log";
import { deviceUrl, fetchDevice, ssdpSearch, xmlTag } from "./ssdp";
import type { Adapter, Device } from "./types";

// Roku External Control Protocol (ECP), HTTP on port 8060. Requires the Roku setting
// "Control by mobile apps" to not be Disabled (Settings → System → Advanced system settings).

/** ECP base URL for a device; host is always the device's own address. */
const ecp = (device: Device, path: string) => new URL(path, `http://${device.host}:${device.port}`);

export const roku: Adapter = {
  protocol: "roku",
  label: "Roku",

  async discover(onFound, durationMs) {
    const seen = new Set<string>();
    const pending: Promise<void>[] = [];
    await ssdpSearch(["roku:ecp"], durationMs, ({ headers, address }) => {
      // The location must point back at the device that answered (see deviceUrl); malformed ones are ignored.
      const location = deviceUrl(headers.location, address);
      if (!location || seen.has(location.toString())) return;
      seen.add(location.toString());
      pending.push(
        fetchDevice(new URL("/query/device-info", location))
          .then((r) => r.text())
          .then((xml) =>
            onFound({
              protocol: "roku",
              id: xmlTag(xml, "serial-number") ?? location.toString(),
              name: xmlTag(xml, "user-device-name") ?? xmlTag(xml, "friendly-device-name") ?? "Roku",
              model: xmlTag(xml, "friendly-model-name") ?? xmlTag(xml, "model-name") ?? "Roku",
              host: address,
              port: Number(location.port) || 8060,
            }),
          )
          .catch(() => undefined),
      );
    });
    await Promise.all(pending);
  },

  async play(device, urls) {
    const log = protocolLog("roku");
    // 15985 is Roku's built-in "Play on Roku" media input.
    const params = new URLSearchParams({ t: "v", u: urls.hls, videoName: "RameCast Screen", videoFormat: "hls" });
    const endpoint = ecp(device, `/input/15985?${params}`);
    log(`>> POST ${endpoint}`);
    const res = await fetchDevice(endpoint, { method: "POST" }, 10000);
    log(`<< ${res.status}`);
    if (res.status === 403) {
      throw new Error("Roku blocked the request. Set Control by mobile apps to Default or Permissive.");
    }
    if (!res.ok) throw new Error(`Roku rejected the stream: HTTP ${res.status}`);
    return {};
  },

  async stop(device) {
    // Only leave the player if it's still in front; never press Home on a channel the user opened since.
    const active = await fetchDevice(ecp(device, "/query/active-app")).then((r) => r.text());
    const app = active.match(/<app[^>]*id="(\d+)"[^>]*>([^<]*)</);
    const isPlayer = !!app && (app[1] === "15985" || app[1] === "782875" || /media player/i.test(app[2]));
    if (!isPlayer) return;
    await fetchDevice(ecp(device, "/keypress/Home"), { method: "POST" }, 5000);
  },
};
