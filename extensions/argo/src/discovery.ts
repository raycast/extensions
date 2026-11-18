import { createHash, createPublicKey, randomBytes, verify } from "node:crypto";
import { mkdir, open, unlink } from "node:fs/promises";
import { join } from "node:path";
import { localUrl } from "./protocol.js";

export const DEFAULT_PORT_START = 49120,
  DEFAULT_PORT_END = 49139;
export type DiscoveredBridge = { url: string; bridgeId: string; publicKey: string };
export function portRange(
  start: string | number = DEFAULT_PORT_START,
  end: string | number = DEFAULT_PORT_END,
): number[] {
  const a = Number(start),
    b = Number(end);
  if (
    !/^\d+$/.test(String(start)) ||
    !/^\d+$/.test(String(end)) ||
    !Number.isInteger(a) ||
    !Number.isInteger(b) ||
    a < 1024 ||
    b > 65535 ||
    b < a ||
    b - a >= 64
  )
    throw new Error("Choose a loopback port range of at most 64 ports, between 1024 and 65535.");
  return Array.from({ length: b - a + 1 }, (_, i) => a + i);
}
async function smallJson(response: Response): Promise<unknown> {
  if (!response.ok || !response.body) {
    await response.body?.cancel();
    throw new Error("Bridge request failed.");
  }
  const chunks: Buffer[] = [];
  let size = 0;
  const reader = response.body.getReader();
  try {
    while (true) {
      const { value: part, done } = await reader.read();
      if (done) break;
      size += part.byteLength;
      if (size > 16384) throw new Error("Bridge response exceeds size limit.");
      chunks.push(Buffer.from(part));
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new Error("Bridge returned an invalid response.");
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}
export async function discoverBridge(url: string, signal?: AbortSignal): Promise<DiscoveredBridge> {
  const origin = localUrl(url).origin,
    challenge = randomBytes(16).toString("hex");
  const response = await fetch(`${origin}/v1/discovery?challenge=${challenge}`, {
    redirect: "error",
    credentials: "omit",
    signal: AbortSignal.any([AbortSignal.timeout(1200), ...(signal ? [signal] : [])]),
  });
  const value = (await smallJson(response)) as Record<string, unknown>;
  if (
    !value ||
    value.service !== "argo" ||
    value.protocol !== 1 ||
    value.challenge !== challenge ||
    typeof value.bridgeId !== "string" ||
    !/^[a-f0-9]{64}$/.test(value.bridgeId) ||
    typeof value.publicKey !== "string" ||
    value.publicKey.length > 256 ||
    typeof value.signature !== "string" ||
    value.signature.length > 128
  )
    throw new Error("This port did not prove an Argo bridge identity.");
  const der = Buffer.from(value.publicKey, "base64");
  const key = createPublicKey({ key: der, format: "der", type: "spki" });
  if (
    key.asymmetricKeyType !== "ed25519" ||
    createHash("sha256").update(der).digest("hex") !== value.bridgeId ||
    !verify(
      null,
      Buffer.from(`argo-discovery-v1\n${challenge}\n${value.bridgeId}`),
      key,
      Buffer.from(value.signature, "base64"),
    )
  )
    throw new Error("Bridge identity proof failed.");
  return { url: origin, bridgeId: value.bridgeId, publicKey: value.publicKey };
}
export async function discoverBridges(ports = portRange(), signal?: AbortSignal): Promise<DiscoveredBridge[]> {
  if (ports.length > 64 || ports.some((port) => !Number.isInteger(port) || port < 1024 || port > 65535))
    throw new Error("Invalid discovery ports.");
  const found: DiscoveredBridge[] = [];
  let index = 0;
  await Promise.all(
    Array.from({ length: Math.min(4, ports.length) }, async () => {
      while (index < ports.length && !signal?.aborted) {
        const port = ports[index++]!;
        try {
          found.push(await discoverBridge(`http://127.0.0.1:${port}`, signal));
        } catch {
          /* Unrelated/closed ports are not bridges. Never send credentials while scanning. */
        }
      }
    }),
  );
  return found.sort((a, b) => a.url.localeCompare(b.url));
}
export function clientCodeIdentity(code: string): string {
  const match = /^ARGO-CLIENT-([a-f0-9]{64})-[a-f0-9]{32}$/.exec(code.trim());
  if (!match) throw new Error("Paste the fresh Mac pairing code returned by server setup, not an Agent pairing code.");
  return match[1]!;
}
export async function pairDiscoveredBridge(target: DiscoveredBridge, code: string, directory: string): Promise<string> {
  if (clientCodeIdentity(code) !== target.bridgeId) throw new Error("This pairing code belongs to a different bridge.");
  const current = await discoverBridge(target.url);
  if (current.bridgeId !== target.bridgeId)
    throw new Error("The forwarded port now belongs to a different bridge. Scan again.");
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const path = join(directory, `${target.bridgeId}-${randomBytes(8).toString("hex")}.json`);
  // Reserve the private file before consuming a single-use code.
  const file = await open(path, "wx", 0o600);
  let saved = false;
  try {
    const response = await fetch(`${target.url}/v1/client-pairings/claim`, {
      method: "POST",
      redirect: "error",
      credentials: "omit",
      signal: AbortSignal.timeout(10000),
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code.trim() }),
    });
    const value = (await smallJson(response)) as Record<string, unknown>;
    if (
      !value ||
      value.bridgeId !== target.bridgeId ||
      typeof value.token !== "string" ||
      !/^[a-f0-9]{64}$/.test(value.token)
    )
      throw new Error("Invalid pairing response. Request a fresh code from the server.");
    await file.writeFile(JSON.stringify({ url: target.url, token: value.token, bridgeId: target.bridgeId }) + "\n");
    await file.sync();
    saved = true;
    return path;
  } catch {
    throw new Error(
      "Pairing could not be confirmed. Request a fresh Mac pairing code; do not retry an uncertain claim.",
    );
  } finally {
    await file.close();
    if (!saved) await unlink(path).catch(() => undefined);
  }
}
