import { createConnection } from "node:net";
import {
  MAX_STRUCTURED_PAYLOAD_BYTES,
  SPACE_API_ERROR_CODES,
  SpaceAPIProtocolError,
  type JSONRPCResponse,
} from "./contract";
import { decodeStructuredRPCEvent, decodeStructuredRPCResponse, protocolError } from "./codec";

const SOCKET_HEADER_BYTES = 4;

export class SpaceAPISocketUnavailable extends Error {
  constructor() {
    super("The DesktopRenamer socket transport is unavailable.");
    this.name = "SpaceAPISocketUnavailable";
  }
}

export function encodeSpaceAPIFrame(payload: Buffer): Buffer {
  if (payload.length === 0 || payload.length > MAX_STRUCTURED_PAYLOAD_BYTES) {
    throw protocolError(
      "Structured SpaceAPI payload has an invalid size.",
      SPACE_API_ERROR_CODES.payloadTooLarge,
      undefined,
      false,
    );
  }
  const header = Buffer.allocUnsafe(SOCKET_HEADER_BYTES);
  header.writeUInt32BE(payload.length, 0);
  return Buffer.concat([header, payload]);
}

export function decodeSpaceAPIFrames(buffer: Buffer): { frames: Buffer[]; remainder: Buffer } {
  const frames: Buffer[] = [];
  let offset = 0;
  while (buffer.length - offset >= SOCKET_HEADER_BYTES) {
    const length = buffer.readUInt32BE(offset);
    if (length === 0 || length > MAX_STRUCTURED_PAYLOAD_BYTES) {
      throw protocolError(
        "DesktopRenamer sent an invalid SpaceAPI frame size.",
        SPACE_API_ERROR_CODES.payloadTooLarge,
        undefined,
        false,
      );
    }
    const frameEnd = offset + SOCKET_HEADER_BYTES + length;
    if (frameEnd > buffer.length) break;
    frames.push(buffer.subarray(offset + SOCKET_HEADER_BYTES, frameEnd));
    offset = frameEnd;
  }
  return { frames, remainder: buffer.subarray(offset) };
}

export async function requestSpaceAPISocket(
  payload: string,
  expectedID: string,
  timeoutMs: number,
  maximumPayloadBytes = MAX_STRUCTURED_PAYLOAD_BYTES,
): Promise<JSONRPCResponse> {
  const endpoint = getDesktopRenamerSocketPath();
  const requestData = Buffer.from(payload, "utf8");
  if (requestData.length > maximumPayloadBytes) {
    throw protocolError(
      "Structured SpaceAPI request exceeds the maximum size.",
      SPACE_API_ERROR_CODES.payloadTooLarge,
      undefined,
      false,
    );
  }

  return await new Promise<JSONRPCResponse>((resolve, reject) => {
    const socket = createConnection(endpoint);
    let settled = false;
    let connecting = true;
    let received: Buffer<ArrayBufferLike> = Buffer.alloc(0);
    const finish = (error?: Error, response?: JSONRPCResponse) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      if (error) reject(error);
      else if (response) resolve(response);
      else
        reject(
          protocolError(
            "DesktopRenamer closed the SpaceAPI connection without a response.",
            undefined,
            undefined,
            false,
          ),
        );
    };

    socket.setTimeout(timeoutMs, () => {
      finish(protocolError("DesktopRenamer SpaceAPI socket request timed out.", undefined, undefined, false));
    });
    socket.once("connect", () => {
      connecting = false;
      try {
        socket.write(encodeSpaceAPIFrame(requestData));
      } catch (error) {
        finish(asNonFallbackError(error));
      }
    });
    socket.on("data", (chunk) => {
      try {
        received = Buffer.concat([received, chunk]);
        if (received.length > maximumPayloadBytes * 4 + SOCKET_HEADER_BYTES * 4) {
          throw protocolError(
            "DesktopRenamer SpaceAPI response exceeds the maximum size.",
            SPACE_API_ERROR_CODES.payloadTooLarge,
            undefined,
            false,
          );
        }
        const decoded = decodeSpaceAPIFrames(received);
        received = decoded.remainder;
        for (const frame of decoded.frames) {
          const text = frame.toString("utf8");
          const value = JSON.parse(text) as unknown;
          if (isJSONRPCEvent(value)) {
            decodeStructuredRPCEvent(text, maximumPayloadBytes);
            continue;
          }
          const response = decodeStructuredRPCResponse(text, expectedID, maximumPayloadBytes);
          finish(undefined, response);
          return;
        }
      } catch (error) {
        finish(asNonFallbackError(error));
      }
    });
    socket.once("error", (error: NodeJS.ErrnoException) => {
      if (connecting && (error.code === "ENOENT" || error.code === "ECONNREFUSED")) {
        finish(new SpaceAPISocketUnavailable());
      } else {
        finish(protocolError(error.message || "SpaceAPI socket communication failed.", undefined, undefined, false));
      }
    });
    socket.once("end", () => finish());
  });
}

export function getDesktopRenamerSocketPath(): string {
  const userID = process.getuid?.();
  if (userID === undefined) {
    throw protocolError("The DesktopRenamer socket is only available on macOS.", undefined, undefined, false);
  }
  return `/tmp/dev.mqiu.DesktopRenamer-${userID}.sock`;
}

function isJSONRPCEvent(value: unknown): value is { method: string } {
  return typeof value === "object" && value !== null && !Array.isArray(value) && "method" in value && !("id" in value);
}

function asNonFallbackError(error: unknown): Error {
  if (error instanceof SpaceAPIProtocolError) {
    return new SpaceAPIProtocolError(error.message, error.code, error.data, false);
  }
  return protocolError(
    error instanceof Error ? error.message : "Structured SpaceAPI socket request failed.",
    SPACE_API_ERROR_CODES.invalidRequest,
    undefined,
    false,
  );
}
