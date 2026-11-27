import { createSocket } from "node:dgram";

/**
 * Per-segment colour over LAN, through Govee's undocumented "ptReal" command: the light's own
 * Bluetooth packet, base64-wrapped in a LAN message to UDP 4003. Instant, no cloud limit.
 * Same packet as govee-local-api (Home Assistant's "Govee lights local").
 */

/**
 * Models known to take it, with their segment count: govee-local-api 3.3.1's segment-capable list
 * (only ≤ 15 segments, the most this packet's mask can address), plus H61A2 (tested by hand).
 * shortcut: a fixed list, extend it when another model is confirmed.
 */
export const LAN_SEGMENT_MODELS: Record<string, number> = {
  H16C0: 7,
  H6039: 12,
  H6042: 5,
  H6043: 10,
  H6046: 10,
  H6047: 10,
  H6048: 15,
  H6069: 15,
  H6072: 8,
  H6076: 7,
  H607C: 13,
  H6087: 12,
  H6088: 6,
  H608B: 15,
  H60A1: 13,
  H60A4: 11,
  H60B1: 3,
  H60B2: 3,
  H60C1: 3,
  H610E: 7,
  H610F: 7,
  H612C: 10,
  H612F: 5,
  H6167: 12,
  H6169: 15,
  H616D: 15,
  H618A: 15,
  H618C: 15,
  H618E: 15,
  H618F: 15,
  H619A: 10,
  H619B: 10,
  H619C: 10,
  H619D: 10,
  H619E: 10,
  H61A2: 15,
  H61B3: 15,
  H61B8: 15,
  H61D3: 15,
  H61E5: 12,
  H61E6: 15,
  H61F2: 4,
  H61F5: 10,
  H61F6: 15,
  H6640: 14,
  H6641: 14,
  H6671: 14,
  H7025: 15,
  H7026: 15,
  H702A: 15,
  H7039: 15,
  H7052: 15,
  H705D: 9,
  H705E: 15,
  H705F: 15,
  H7076: 15,
  H7078: 4,
  H7093: 2,
  H70A1: 15,
  H70A3: 15,
  H70B5: 3,
  H70C4: 10,
  H70C5: 10,
  H70C7: 10,
  H70D1: 10,
  H70D2: 10,
  H805C: 9,
  H8072: 8,
  H808A: 5,
  H80A1: 14,
  H80C5: 10,
};

// 33 05 15 01 RR GG BB 00×5 MASK(lo, hi) 00×5 + XOR checksum = 20 bytes. Bit n = segment n (0-based).
export const segmentPacket = (hex: string, segments: number[]) => {
  const n = parseInt(hex.replace("#", ""), 16);
  const m = segments.reduce((acc, s) => acc | (1 << s), 0);
  const body = [0x33, 0x05, 0x15, 0x01, (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff, 0, 0, 0, 0, 0];
  body.push(m & 0xff, (m >> 8) & 0xff, 0, 0, 0, 0, 0);
  return Buffer.from([...body, body.reduce((x, y) => x ^ y, 0)]);
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** One message per colour group, 30 ms apart (the light doesn't reply, so this can't confirm). */
export const sendLanSegments = async (ip: string, groups: Array<[string, number[]]>) => {
  const sock = createSocket("udp4");
  try {
    for (const [hex, segs] of groups) {
      const msg = JSON.stringify({
        msg: { cmd: "ptReal", data: { command: [segmentPacket(hex, segs).toString("base64")] } },
      });
      await new Promise<void>((res, rej) => sock.send(msg, 4003, ip, (e) => (e ? rej(e) : res())));
      await sleep(30);
    }
  } finally {
    sock.close();
  }
};
