import net from "node:net";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";

/**
 * Minimal client for the DRPC wire protocol (github.com/storj/drpc) over a Unix socket.
 *
 * Blip's desktop app hosts its Go core behind this socket. The same socket serves
 * Blip's own Share extension, so the protocol is stable across the app's processes.
 */

export const SOCKET_PATH = path.join(os.homedir(), "Library/Group Containers/AY8UB8KTUX.blip/Library/Caches/sock");

const enum Kind {
  Invoke = 1,
  Message = 2,
  Error = 3,
  Close = 5,
  CloseSend = 6,
}

export class BlipUnavailableError extends Error {
  constructor(message = "Blip is not running") {
    super(message);
    this.name = "BlipUnavailableError";
  }
}

export class BlipRpcError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BlipRpcError";
  }
}

function appendVarint(out: number[], value: number | bigint) {
  let v = BigInt(value);
  while (v >= 0x80n) {
    out.push(Number(v & 0x7fn) | 0x80);
    v >>= 7n;
  }
  out.push(Number(v));
}

function frame(kind: Kind, stream: number, message: number, data: Uint8Array): Buffer {
  const header: number[] = [(kind << 1) | 1]; // done bit set: we never split frames
  appendVarint(header, stream);
  appendVarint(header, message);
  appendVarint(header, data.length);
  return Buffer.concat([Buffer.from(header), data]);
}

function readVarint(buf: Buffer, offset: number): [bigint, number] | null {
  let result = 0n;
  let shift = 0n;
  for (;;) {
    if (offset >= buf.length) return null;
    const byte = buf[offset++];
    result |= BigInt(byte & 0x7f) << shift;
    shift += 7n;
    if (byte < 0x80) return [result, offset];
  }
}

interface Frame {
  kind: number;
  done: boolean;
  data: Buffer;
}

function parseFrames(buf: Buffer): [Frame[], Buffer] {
  const frames: Frame[] = [];
  let offset = 0;
  for (;;) {
    if (buf.length - offset < 4) break;
    const control = buf[offset];
    const stream = readVarint(buf, offset + 1);
    if (!stream) break;
    const message = readVarint(buf, stream[1]);
    if (!message) break;
    const length = readVarint(buf, message[1]);
    if (!length) break;
    const start = length[1];
    const end = start + Number(length[0]);
    if (end > buf.length) break;
    frames.push({ kind: (control & 0x7e) >> 1, done: (control & 1) === 1, data: buf.subarray(start, end) });
    offset = end;
  }
  return [frames, buf.subarray(offset)];
}

export function socketExists(): boolean {
  return fs.existsSync(SOCKET_PATH);
}

/**
 * Performs one unary RPC. Opens a fresh connection per call, which mirrors how
 * drpc clients behave and keeps the state machine trivial.
 */
export function invoke(rpc: string, request: Uint8Array, timeoutMs = 10_000): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const socket = net.connect(SOCKET_PATH);
    let buffer: Buffer = Buffer.alloc(0);
    const parts: Buffer[] = [];
    let settled = false;
    let message = 0;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn();
      socket.destroy();
    };

    const timer = setTimeout(
      () => finish(() => reject(new BlipRpcError(`Blip did not answer ${rpc} within ${timeoutMs / 1000}s`))),
      timeoutMs,
    );

    socket.once("connect", () => {
      socket.write(frame(Kind.Invoke, 1, ++message, Buffer.from(rpc)));
      socket.write(frame(Kind.Message, 1, ++message, request));
      socket.write(frame(Kind.CloseSend, 1, ++message, Buffer.alloc(0)));
    });

    socket.on("data", (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      const [frames, rest] = parseFrames(buffer);
      buffer = rest;
      for (const f of frames) {
        if (f.kind === Kind.Error) {
          finish(() => reject(new BlipRpcError(f.data.toString("utf8") || "Blip returned an error")));
          return;
        }
        if (f.kind === Kind.Message) {
          parts.push(Buffer.from(f.data));
          if (f.done) {
            const result = Buffer.concat(parts);
            // Politely close our side before tearing the connection down.
            try {
              socket.write(frame(Kind.Close, 1, ++message, Buffer.alloc(0)));
            } catch {
              // ignore: the connection is being destroyed anyway
            }
            finish(() => resolve(result));
            return;
          }
        }
        if (f.kind === Kind.Close) {
          finish(() => reject(new BlipRpcError(`Blip closed ${rpc} without a response`)));
          return;
        }
      }
    });

    socket.on("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT" || error.code === "ECONNREFUSED") {
        finish(() => reject(new BlipUnavailableError()));
      } else {
        finish(() => reject(error));
      }
    });

    socket.on("close", () => {
      finish(() => reject(new BlipUnavailableError("Blip closed the connection")));
    });
  });
}
