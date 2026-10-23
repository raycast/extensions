// A Node port of the official /dev/null commit script (https://dev-null.sh/commit), minus replies.
// The protocol, in three requests' worth of steps:
// 1. Collect the user's Ed25519/RSA public keys (SSH agents + ~/.ssh/*.pub) and ask /dev/null
//    which one is on their GitHub account.
// 2. Sign "<unix time>\n<nonce>\n<reply-to>\n<message>" with that key via `ssh-keygen -Y sign`
//    in the "devnull-commit" namespace. With images, a line of their comma-separated SHA-256
//    hashes goes before the message, and the namespace is "devnull-commit-images".
// 3. POST the payload with the signature in an `X-SSH-Signature` header: as the raw body, or with
//    images, as a multipart form of the payload file and the images.
// Private keys are never read: ssh-keygen or the SSH agent uses them.

import { execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { bodyError } from "./body";
import { loadImages, type Image } from "./images";

const execFileAsync = promisify(execFile);

export const DEVNULL_URL = "https://dev-null.sh";

export interface CommitResult {
  url?: string;
  /** Held for review: only the author can see it until it is approved. */
  pending: boolean;
}

// The server answers "Committed: <url>", plus " (pending review, …)" when the commit is held.
export function parseCommitAnswer(answer: string): CommitResult {
  return { url: answer.match(/https?:\/\/\S+/)?.[0], pending: /pending review/i.test(answer) };
}

const NAMESPACE = "devnull-commit";
const IMAGES_NAMESPACE = "devnull-commit-images";
const SSH_ADD = "/usr/bin/ssh-add";
const AGENT_LIST_TIMEOUT_MS = 10_000;
const SSH_KEYGEN = "/usr/bin/ssh-keygen";
// Long enough for an agent that asks for Touch ID or a click before it signs.
const SIGN_TIMEOUT_MS = 120_000;
const REQUEST_TIMEOUT_MS = 30_000;
// The official script allows 10 minutes for a commit carrying up to 30 MB of images.
const UPLOAD_TIMEOUT_MS = 600_000;

// Raycast doesn't inherit a shell's SSH_AUTH_SOCK, so also look where the common
// third-party agents put their sockets.
const AGENT_SOCKETS = [
  "Library/Group Containers/2BUA8C4S2C.com.1password/t/agent.sock",
  "Library/Containers/com.maxgoedjen.Secretive.SecretAgent/Data/socket.ssh",
];

export interface Commit {
  message: string;
  /** Up to 3 JPEG, PNG or WebP files. A leading `~` is expanded. */
  imagePaths?: string[];
}

export interface CommitOptions {
  baseUrl?: string;
  home?: string;
  agentSockets?: string[];
  /** Diagnostics sink; the command passes the Raycast logger. Never receives the signature or message. */
  log?: Log;
  /**
   * SHA-256 of each image as the user approved it. The commit is refused if any file has changed since.
   * `null` means the caller looked for the user's approval and found none, so nothing can be compared;
   * leave it out when there is no approval step, as in the form.
   */
  approvedImageHashes?: string[] | null;
}

export type Log = (message: string, data?: Record<string, unknown>) => void;

interface Candidate {
  /** "<type> <base64>", without the comment. */
  id: string;
  /** The agent socket holding it, or the private key file next to its .pub. */
  source: { agent: string } | { file: string };
}

export function keyId(line: string): string {
  return line.trim().split(/\s+/).slice(0, 2).join(" ");
}

function isSupportedKey(line: string): boolean {
  return /^(ssh-ed25519|ssh-rsa) /.test(line);
}

// The socket of macOS's own launchd-managed agent, which `ssh-add` in Terminal loads keys into.
async function launchdSocket(): Promise<string | undefined> {
  try {
    const { stdout } = await execFileAsync("/bin/launchctl", ["getenv", "SSH_AUTH_SOCK"]);
    return stdout.trim() || undefined;
  } catch {
    return undefined;
  }
}

export async function agentSockets(home: string): Promise<string[]> {
  const sockets = [process.env.SSH_AUTH_SOCK, await launchdSocket(), ...AGENT_SOCKETS.map((path) => join(home, path))];
  return [...new Set(sockets.filter((socket): socket is string => !!socket && existsSync(socket)))];
}

async function agentKeys(socket: string): Promise<string[]> {
  try {
    // An agent that never answers must not keep the other agents and ~/.ssh from being tried.
    const { stdout } = await execFileAsync(SSH_ADD, ["-L"], {
      env: { ...process.env, SSH_AUTH_SOCK: socket },
      timeout: AGENT_LIST_TIMEOUT_MS,
    });
    return stdout.split("\n").filter(isSupportedKey);
  } catch {
    // An empty or unreachable agent exits non-zero; it simply contributes no keys.
    return [];
  }
}

async function fileKeys(home: string): Promise<Candidate[]> {
  const sshDir = join(home, ".ssh");
  let names: string[];
  try {
    names = await readdir(sshDir);
  } catch {
    return [];
  }
  const candidates: Candidate[] = [];
  for (const name of names.filter((name) => name.endsWith(".pub"))) {
    const privateKey = join(sshDir, name.slice(0, -".pub".length));
    if (!existsSync(privateKey)) continue;
    let firstLine: string;
    try {
      firstLine = (await readFile(join(sshDir, name), "utf8")).split("\n")[0];
    } catch {
      // An unreadable file or a broken symlink must not hide the keys that are usable.
      continue;
    }
    if (isSupportedKey(firstLine)) candidates.push({ id: keyId(firstLine), source: { file: privateKey } });
  }
  return candidates;
}

async function findCandidates(home: string, sockets: string[]): Promise<Candidate[]> {
  const candidates: Candidate[] = [];
  for (const socket of sockets) {
    for (const line of await agentKeys(socket)) candidates.push({ id: keyId(line), source: { agent: socket } });
  }
  candidates.push(...(await fileKeys(home)));
  // First source wins, so a key that is in an agent is signed through the agent.
  const seen = new Set<string>();
  return candidates.filter((candidate) => !seen.has(candidate.id) && seen.add(candidate.id));
}

/** A non-2xx answer. Its message is the server's body, trimmed. */
export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export async function request(
  url: string,
  init: RequestInit,
  log: Log,
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<string> {
  const method = init.method ?? "GET";
  const started = performance.now();
  const elapsedMs = () => Math.round(performance.now() - started);
  log("Request started", { method, url });
  let response: Response;
  let body: string;
  const signal = AbortSignal.timeout(timeoutMs);
  // Node's fetch does not reliably abort a body read that has stalled after the headers arrived,
  // so the body races the same deadline instead of trusting the signal to end it.
  const deadline = new Promise<never>((_, reject) =>
    signal.addEventListener("abort", () => reject(signal.reason), { once: true }),
  );
  deadline.catch(() => undefined);
  try {
    response = await fetch(url, { ...init, redirect: "error", signal });
    body = await Promise.race([response.text(), deadline]);
  } catch (error) {
    log("Request failed", { method, url, ms: elapsedMs(), error: error instanceof Error ? error.name : String(error) });
    throw new Error(`Could not reach ${new URL(url).origin}.`, { cause: error });
  }
  log("Request finished", {
    method,
    url,
    status: response.status,
    ms: elapsedMs(),
    bytes: Buffer.byteLength(body, "utf8"),
  });
  if (!response.ok) {
    throw new HttpError(
      body.trim() || `Unexpected answer from ${new URL(url).origin} (HTTP ${response.status}).`,
      response.status,
    );
  }
  return body;
}

export function buildPayload(message: string, imageHashes: string[] = [], now = new Date()): string {
  const timestamp = Math.floor(now.getTime() / 1000);
  const nonce = randomBytes(16).toString("hex");
  // The empty line is the reply-to hash; this extension only makes top-level commits.
  const header = `${timestamp}\n${nonce}\n`;
  return imageHashes.length > 0 ? `${header}\n${imageHashes.join(",")}\n${message}` : `${header}\n${message}`;
}

export function parseSignature(armored: string): string {
  const signature = armored
    .split("\n")
    .filter((line) => !line.includes("-----"))
    .join("");
  if (!/^[A-Za-z0-9+/=]+$/.test(signature)) throw new Error("ssh-keygen produced an unexpected signature.");
  return signature;
}

async function sign(payload: string, key: Candidate, namespace: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "devnull-"));
  try {
    const commitPath = join(dir, "commit");
    await writeFile(commitPath, payload, { mode: 0o600 });

    let signingKey: string;
    const env = { ...process.env };
    if ("agent" in key.source) {
      // Given a public key, ssh-keygen asks the agent to sign with its private half.
      signingKey = join(dir, "key.pub");
      await writeFile(signingKey, `${key.id}\n`, { mode: 0o600 });
      env.SSH_AUTH_SOCK = key.source.agent;
    } else {
      signingKey = key.source.file;
      // None of the agents we found holds this key, so keep ssh-keygen from asking one.
      delete env.SSH_AUTH_SOCK;
    }

    try {
      await execFileAsync(SSH_KEYGEN, ["-Y", "sign", "-n", namespace, "-f", signingKey, commitPath], {
        env,
        timeout: SIGN_TIMEOUT_MS,
      });
    } catch (error) {
      const stderr = (error as { stderr?: string }).stderr?.trim();
      const hint =
        "file" in key.source ? ` If the key has a passphrase, add it to your SSH agent with \`ssh-add\` first.` : "";
      throw new Error(`Could not sign your commit.${stderr ? ` ${stderr}` : ""}${hint}`, { cause: error });
    }

    return parseSignature(await readFile(`${commitPath}.sig`, "utf8"));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/**
 * Checks a commit against /dev/null's rules and loads its images. Throws the first problem, worded for the user.
 * Nothing leaves the Mac, so it is safe to call before asking anyone to confirm.
 */
export async function prepareCommit(commit: Commit): Promise<{ message: string; images: Image[] }> {
  const problem = bodyError(commit.message);
  if (problem) throw new Error(problem);
  const paths = (commit.imagePaths ?? []).filter((path) => path.trim() !== "");
  return { message: commit.message, images: await loadImages(paths) };
}

/** Checks, signs and posts a commit. Refuses before signing anything /dev/null would refuse. */
export async function postCommit(commit: Commit, options: CommitOptions = {}): Promise<CommitResult> {
  const baseUrl = options.baseUrl ?? DEVNULL_URL;
  const home = options.home ?? homedir();
  const log = options.log ?? (() => undefined);

  const { message, images } = await prepareCommit(commit);
  const approved = options.approvedImageHashes;
  if (approved && approved.join(",") !== images.map((image) => image.sha256).join(",")) {
    throw new Error("An image changed after you approved the commit. Nothing was posted; try again to review it.");
  }
  log("Checked commit", {
    images: images.length,
    imageBytes: images.reduce((sum, image) => sum + image.data.length, 0),
    // "not recorded": the AI tool found no approval for this exact commit, so nothing was compared.
    // "not used": the caller, such as the form, has no approval step.
    approval: approved ? "matched" : approved === null ? "not recorded" : "not used",
  });

  const sockets = options.agentSockets ?? (await agentSockets(home));

  const candidates = await findCandidates(home, sockets);
  log("Found SSH keys", {
    agents: sockets.length,
    agentKeys: candidates.filter((candidate) => "agent" in candidate.source).length,
    fileKeys: candidates.filter((candidate) => "file" in candidate.source).length,
  });
  if (candidates.length === 0) throw new Error("No Ed25519 or RSA SSH key found in your SSH agent or in ~/.ssh.");

  const lookup = await request(
    `${baseUrl}/api/cli/key-lookups`,
    {
      method: "POST",
      headers: { "Content-Type": "text/plain; charset=utf-8" },
      body: candidates.map((candidate) => candidate.id).join("\n") + "\n",
    },
    log,
  );
  // Only ever sign with one of our own keys, whatever /dev/null answers.
  const chosen = candidates.find((candidate) => candidate.id === keyId(lookup.split("\n")[0]));
  if (!chosen) throw new Error(`Unexpected answer from ${baseUrl}.`);

  const payload = buildPayload(
    message,
    images.map((image) => image.sha256),
  );
  const signStarted = performance.now();
  const signature = await sign(payload, chosen, images.length > 0 ? IMAGES_NAMESPACE : NAMESPACE);
  log("Signed commit", {
    keyType: chosen.id.split(" ")[0],
    via: "agent" in chosen.source ? "agent" : "key file",
    ms: Math.round(performance.now() - signStarted),
  });

  if (images.length === 0) {
    const answer = await request(
      `${baseUrl}/api/cli/commits`,
      {
        method: "POST",
        headers: { "Content-Type": "text/plain; charset=utf-8", "X-SSH-Signature": signature },
        body: payload,
      },
      log,
    );
    return parseCommitAnswer(answer);
  }

  // The server reads the payload as an uploaded file and hashes each image file it receives, in order.
  const form = new FormData();
  form.append("payload", new Blob([payload], { type: "text/plain; charset=utf-8" }), "commit");
  images.forEach((image, index) =>
    form.append("images[]", new Blob([new Uint8Array(image.data)], { type: image.type }), `image-${index + 1}`),
  );
  const answer = await request(
    `${baseUrl}/api/cli/commits`,
    { method: "POST", headers: { "X-SSH-Signature": signature }, body: form },
    log,
    UPLOAD_TIMEOUT_MS,
  );
  return parseCommitAnswer(answer);
}
