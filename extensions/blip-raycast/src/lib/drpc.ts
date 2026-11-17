/**
 * Minimal unary client for DRPC (storj.io/drpc), the RPC framing Blip's engine
 * speaks on its local socket.
 *
 * Wire format of one frame:
 *   control byte  = (kind << 1) | done          (bit 7 = control frame, unused here)
 *   varint stream id, varint message id, varint data length, data
 *
 * A unary call is: Invoke(method name) → Message(request) → CloseSend.
 * The server answers with one Message (possibly split over several frames,
 * the last one carrying `done`) followed by CloseSend, or with an Error frame
 * whose data is an 8-byte error code followed by the message text.
 */
import type { Duplex } from "node:stream";

export const FrameKind = {
  Invoke: 1,
  Message: 2,
  Error: 3,
  Close: 5,
  CloseSend: 6,
} as const;

export interface Frame {
  kind: number;
  done: boolean;
  streamId: number;
  messageId: number;
  data: Buffer;
}

export class DrpcError extends Error {
  constructor(
    message: string,
    readonly code?: bigint,
  ) {
    super(message);
    this.name = "DrpcError";
  }
}

export class DrpcTimeoutError extends DrpcError {
  constructor(method: string) {
    super(`Timed out calling ${method}`);
    this.name = "DrpcTimeoutError";
  }
}

export function encodeVarint(value: number): Buffer {
  const bytes: number[] = [];
  let v = value;
  while (v >= 0x80) {
    bytes.push((v & 0x7f) | 0x80);
    v = Math.floor(v / 128);
  }
  bytes.push(v);
  return Buffer.from(bytes);
}

export function encodeFrame(kind: number, streamId: number, messageId: number, data: Buffer, done = true): Buffer {
  return Buffer.concat([
    Buffer.from([(kind << 1) | (done ? 1 : 0)]),
    encodeVarint(streamId),
    encodeVarint(messageId),
    encodeVarint(data.length),
    data,
  ]);
}

/** Reads a varint at `offset`. Returns undefined when the buffer ends first. */
function readVarint(buf: Buffer, offset: number): [number, number] | undefined {
  let result = 0;
  let multiplier = 1;
  let i = offset;
  while (i < buf.length) {
    const byte = buf[i++];
    result += (byte & 0x7f) * multiplier;
    if (byte < 0x80) return [result, i];
    multiplier *= 128;
  }
  return undefined;
}

/** Incrementally parses frames out of a byte stream. */
export class FrameParser {
  private buffer: Buffer = Buffer.alloc(0);

  push(chunk: Buffer): Frame[] {
    this.buffer = this.buffer.length ? Buffer.concat([this.buffer, chunk]) : chunk;
    const frames: Frame[] = [];
    let offset = 0;
    for (;;) {
      if (offset >= this.buffer.length) break;
      const control = this.buffer[offset];
      const stream = readVarint(this.buffer, offset + 1);
      if (!stream) break;
      const message = readVarint(this.buffer, stream[1]);
      if (!message) break;
      const length = readVarint(this.buffer, message[1]);
      if (!length) break;
      const end = length[1] + length[0];
      if (end > this.buffer.length) break;
      offset = end;
      // Frames with the control bit set are for the transport itself; drpc says to ignore them.
      if (control & 0x80) continue;
      frames.push({
        kind: (control >> 1) & 0x3f,
        done: (control & 1) === 1,
        streamId: stream[0],
        messageId: message[0],
        data: this.buffer.subarray(length[1], end),
      });
    }
    this.buffer = this.buffer.subarray(offset);
    return frames;
  }
}

export function decodeErrorFrame(data: Buffer): DrpcError {
  if (data.length >= 8) {
    return new DrpcError(data.subarray(8).toString("utf8") || "Unknown DRPC error", data.readBigUInt64BE(0));
  }
  return new DrpcError(data.toString("utf8") || "Unknown DRPC error");
}

export interface UnaryCallOptions {
  /** Milliseconds before giving up. Use a long value for long-polls. */
  timeoutMs: number;
  signal?: AbortSignal;
}

/** The bytes of one unary request: Invoke(method), Message(request), CloseSend. */
export function encodeUnaryRequest(method: string, request: Uint8Array): Buffer {
  return Buffer.concat([
    encodeFrame(FrameKind.Invoke, 1, 1, Buffer.from(method, "utf8")),
    encodeFrame(FrameKind.Message, 1, 2, Buffer.from(request)),
    encodeFrame(FrameKind.CloseSend, 1, 3, Buffer.alloc(0)),
  ]);
}

/**
 * Collects a unary response from incoming bytes. `push` returns the response once the call has
 * ended (a final Message, CloseSend or Close), throws the server's error, and returns undefined
 * while more bytes are needed.
 */
class UnaryResponse {
  private readonly parser = new FrameParser();
  private readonly chunks: Buffer[] = [];

  push(bytes: Buffer): Buffer | undefined {
    for (const frame of this.parser.push(bytes)) {
      if (frame.kind === FrameKind.Error) throw decodeErrorFrame(frame.data);
      if (frame.kind === FrameKind.Message) {
        this.chunks.push(frame.data);
        if (frame.done) return Buffer.concat(this.chunks);
      }
      if (frame.kind === FrameKind.CloseSend || frame.kind === FrameKind.Close) return Buffer.concat(this.chunks);
    }
    return undefined;
  }
}

/** Decodes a complete unary response, e.g. one the Windows helper read in full. */
export function decodeUnaryResponse(bytes: Buffer, method: string): Buffer {
  const response = new UnaryResponse().push(bytes);
  if (!response) throw new DrpcError(`Connection closed before ${method} completed`);
  return response;
}

/**
 * Performs one unary call on a freshly connected duplex stream and closes it.
 * One connection per call keeps the client stateless and robust against Blip restarts.
 */
export function unaryCall(connect: () => Duplex, method: string, request: Uint8Array, options: UnaryCallOptions) {
  return new Promise<Buffer>((resolve, reject) => {
    const response = new UnaryResponse();
    let settled = false;
    let socket: Duplex | undefined;

    const finish = (error: Error | undefined, value?: Buffer) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", onAbort);
      socket?.destroy();
      if (error) reject(error);
      else resolve(value ?? Buffer.alloc(0));
    };
    const onAbort = () => finish(new DrpcError("Call aborted"));
    const timer = setTimeout(() => finish(new DrpcTimeoutError(method)), options.timeoutMs);

    if (options.signal?.aborted) return onAbort();
    options.signal?.addEventListener("abort", onAbort);

    try {
      socket = connect();
    } catch (error) {
      return finish(error instanceof Error ? error : new Error(String(error)));
    }
    socket.on("error", (error) => finish(error));
    socket.on("close", () => finish(new DrpcError(`Connection closed before ${method} completed`)));
    socket.on("data", (chunk: Buffer) => {
      try {
        const value = response.push(chunk);
        if (value) finish(undefined, value);
      } catch (error) {
        finish(error as Error);
      }
    });
    socket.write(encodeUnaryRequest(method, request));
  });
}
