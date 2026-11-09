import { Bonjour } from "bonjour-service";
import { CastClient, castv2 } from "./castv2";
import { protocolLog } from "./log";
import type { Adapter, Device } from "./types";

async function withDevice<T>(device: Device, fn: (client: CastClient) => Promise<T>, fresh = true): Promise<T> {
  const client = new (castv2().CastClient)(protocolLog("googlecast", fresh));
  try {
    await client.connect(device.host, device.port);
    return await fn(client);
  } finally {
    client.close();
  }
}

export const googleCast: Adapter = {
  protocol: "googlecast",
  label: "Google Cast",

  discover(onFound, durationMs) {
    return new Promise((resolve) => {
      const bonjour = new Bonjour();
      const browser = bonjour.find({ type: "googlecast" }, (service) => {
        const txt = (service.txt ?? {}) as Record<string, string>;
        const host = service.addresses?.find((a) => /^\d+\.\d+\.\d+\.\d+$/.test(a)) ?? service.referer?.address;
        if (!host) return;
        onFound({
          protocol: "googlecast",
          id: txt.id ?? service.name,
          name: txt.fn ?? service.name,
          model: txt.md ?? "Google Cast",
          host,
          port: service.port,
        });
      });
      // A single query is easily missed by devices waking from standby, so re-ask periodically.
      const requery = setInterval(() => browser.update(), 1500);
      setTimeout(() => {
        clearInterval(requery);
        browser.stop();
        bonjour.destroy();
        resolve();
      }, durationMs);
    });
  },

  play(device, urls) {
    return withDevice(device, (c) =>
      c.loadMedia({ contentId: urls.hls, contentType: "application/x-mpegURL", streamType: "LIVE" }),
    );
  },

  stop(device) {
    return withDevice(device, (c) => c.stopApps(), false);
  },
};
