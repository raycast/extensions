/**
 * Windows: Blip's engine listens on a Unix-domain socket file, which Node can't open there.
 * The Rust helper in rust/src/main.rs opens it and does one request/response exchange per call;
 * DRPC framing and protobuf stay here in TypeScript.
 */
import { decodeUnaryResponse, DrpcError, DrpcTimeoutError, encodeUnaryRequest } from "./drpc";

/** Loaded lazily: the helper only exists in the Windows build of the extension. */
const helper = () => import("rust:../../rust");

/** The helper's error text: the message plus what it wrote to stderr (where Rust errors end up). */
function messageOf(error: unknown) {
  const stderr = (error as { stderr?: string })?.stderr ?? "";
  return `${error instanceof Error ? error.message : String(error)} ${stderr}`;
}

export async function windowsUnaryCall(
  socketPath: string,
  method: string,
  request: Uint8Array,
  { timeoutMs, signal }: { timeoutMs: number; signal?: AbortSignal },
): Promise<Buffer> {
  if (signal?.aborted) throw new DrpcError("Call aborted");
  const { blip_unary_call } = await helper();
  const call = blip_unary_call(socketPath, encodeUnaryRequest(method, request).toString("base64"), timeoutMs);
  // The helper can't be interrupted; an aborted call just stops waiting for it (it ends at its timeout).
  let onAbort: (() => void) | undefined;
  const aborted = new Promise<never>((_, reject) => {
    onAbort = () => reject(new DrpcError("Call aborted"));
    signal?.addEventListener("abort", onAbort, { once: true });
  });
  let response: string;
  try {
    response = await Promise.race([call, aborted]);
  } catch (error) {
    const message = messageOf(error);
    if (message.includes("not-listening")) {
      throw Object.assign(new Error("Blip isn't listening"), { code: "ECONNREFUSED" });
    }
    if (message.includes("timed-out")) throw new DrpcTimeoutError(method);
    throw error;
  } finally {
    // The polling loop reuses one signal for every call, so don't leave a listener behind per call.
    if (onAbort) signal?.removeEventListener("abort", onAbort);
  }
  return decodeUnaryResponse(Buffer.from(response, "base64"), method);
}

export async function windowsIsListening(socketPath: string): Promise<boolean> {
  try {
    const { blip_is_listening } = await helper();
    return await blip_is_listening(socketPath);
  } catch {
    return false;
  }
}
