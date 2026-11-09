import { protocolLog } from "./log";
import { ssdpSearch, xmlTag } from "./ssdp";
import type { Adapter } from "./types";

// Roku External Control Protocol (ECP), HTTP on port 8060. Requires the Roku setting
// "Control by mobile apps" to not be Disabled (Settings → System → Advanced system settings).
export const roku: Adapter = {
  protocol: "roku",
  label: "Roku",

  async discover(onFound, durationMs) {
    const seen = new Set<string>();
    const pending: Promise<void>[] = [];
    await ssdpSearch(["roku:ecp"], durationMs, ({ headers, address }) => {
      const location = headers.location;
      if (!location || seen.has(location)) return;
      seen.add(location);
      const url = new URL(location);
      pending.push(
        fetch(new URL("/query/device-info", location), { signal: AbortSignal.timeout(4000) })
          .then((r) => r.text())
          .then((xml) =>
            onFound({
              protocol: "roku",
              id: xmlTag(xml, "serial-number") ?? location,
              name: xmlTag(xml, "user-device-name") ?? xmlTag(xml, "friendly-device-name") ?? "Roku",
              model: xmlTag(xml, "friendly-model-name") ?? xmlTag(xml, "model-name") ?? "Roku",
              host: address,
              port: Number(url.port) || 8060,
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
    const endpoint = `http://${device.host}:${device.port}/input/15985?${params}`;
    log(`>> POST ${endpoint}`);
    const res = await fetch(endpoint, { method: "POST", signal: AbortSignal.timeout(10000) });
    log(`<< ${res.status}`);
    if (res.status === 403) {
      throw new Error("Roku blocked the request. Set Control by mobile apps to Default or Permissive.");
    }
    if (!res.ok) throw new Error(`Roku rejected the stream: HTTP ${res.status}`);
  },

  async stop(device) {
    await fetch(`http://${device.host}:${device.port}/keypress/Home`, {
      method: "POST",
      signal: AbortSignal.timeout(5000),
    });
  },
};
