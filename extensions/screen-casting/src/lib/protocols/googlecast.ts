import { CastClient, castv2 } from "./castv2";
import { protocolLog } from "./log";
import { browseMdns } from "./mdns";
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
    return browseMdns(
      "googlecast",
      (service) => {
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
      },
      durationMs,
    );
  },

  async play(device, urls) {
    const app = await withDevice(device, (c) =>
      c.loadMedia({ contentId: urls.hls, contentType: "application/x-mpegURL", streamType: "LIVE" }),
    );
    return { castSessionId: app.sessionId };
  },

  async stop(device, playback) {
    if (!playback.castSessionId) return; // never stop an app RameCast didn't launch
    await withDevice(device, (c) => c.stopSession(playback.castSessionId as string), false);
  },
};
