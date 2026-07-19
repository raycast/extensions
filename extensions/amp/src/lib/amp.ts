import { getPreferenceValues, open } from "@raycast/api";
import { execFile, spawn } from "node:child_process";
import { access, chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { homedir } from "node:os";
import { basename, extname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import type {
  AmpProject,
  AmpThreadSummary,
  AmpVisibility,
  LiveAmpThread,
  ThreadAttachment,
  TrackedRun,
} from "../types";

const execFileAsync = promisify(execFile);

function ampEnvironment(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    AMP_USE_FILE_BASED_SECRETS: "1",
  };
}

function expandHome(path: string): string {
  return path.startsWith("~/") ? join(homedir(), path.slice(2)) : path;
}

let cachedAmpPath: string | undefined;

export async function findAmp(): Promise<string> {
  if (cachedAmpPath) return cachedAmpPath;
  cachedAmpPath = await locateAmp();
  return cachedAmpPath;
}

async function locateAmp(): Promise<string> {
  const preferred = getPreferenceValues<Preferences>().ampPath?.trim();
  const candidates = [
    preferred && expandHome(preferred),
    join(homedir(), ".local/bin/amp"),
    "/opt/homebrew/bin/amp",
    "/usr/local/bin/amp",
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    try {
      await access(candidate, constants.X_OK);
      return candidate;
    } catch {
      // Try the next location.
    }
  }

  try {
    const { stdout } = await execFileAsync(
      "/bin/zsh",
      ["-lc", "command -v amp"],
      { timeout: 5_000 },
    );
    const detected = stdout.trim();
    if (detected) return detected;
  } catch {
    // Report a useful error below.
  }

  throw new Error(
    "Amp CLI was not found. Set its absolute path in this extension's preferences.",
  );
}

export async function listProjects(): Promise<AmpProject[]> {
  const { projects } = await callAmpInternal<{ projects: AmpProject[] }>(
    "listAccessibleProjects",
    {},
  );
  return projects;
}

interface APIThread {
  id: string;
  title?: string;
  created?: number;
  userLastInteractedAt?: number;
  messageCount?: number;
}

function toThreadSummary(thread: APIThread): AmpThreadSummary {
  const updatedMs = thread.userLastInteractedAt ?? thread.created;
  return {
    id: thread.id,
    title: thread.title ?? thread.id,
    updated: updatedMs ? new Date(updatedMs).toISOString() : undefined,
    messageCount: thread.messageCount,
  };
}

/**
 * Listing goes through the internal API rather than `amp threads list`: the
 * CLI omits threads its own installation has not touched, so threads this
 * extension created showed as stuck in "Starting" until attached to.
 * `includeEmpty` keeps just-created threads visible for the same reason.
 */
export async function listThreads(all = true): Promise<AmpThreadSummary[]> {
  const pageSize = all ? 500 : 200;
  const threads: AmpThreadSummary[] = [];

  for (let offset = 0; ; offset += pageSize) {
    const { threads: page } = await callAmpInternal<{ threads: APIThread[] }>(
      "listThreads",
      { limit: pageSize, offset, includeEmpty: true },
    );
    threads.push(...page.map(toThreadSummary));
    if (!all || page.length < pageSize) return threads;
  }
}

/** Direct lookup for tracked threads that fall outside the listing page. */
export async function getThreadsByIds(
  threadIds: string[],
): Promise<AmpThreadSummary[]> {
  const threads: AmpThreadSummary[] = [];
  for (let start = 0; start < threadIds.length; start += 100) {
    const { threads: page } = await callAmpInternal<{ threads: APIThread[] }>(
      "listThreads",
      { threadIDs: threadIds.slice(start, start + 100), includeEmpty: true },
    );
    threads.push(...page.map(toThreadSummary));
  }
  return threads;
}

export async function getLiveThreads(
  timeoutMs = 2_500,
): Promise<LiveAmpThread[]> {
  const amp = await findAmp();
  return new Promise((resolve) => {
    const child = spawn(amp, ["top", "--stream-jsonl", "--no-color"], {
      stdio: ["ignore", "pipe", "ignore"],
      env: ampEnvironment(),
    });
    let buffer = "";
    let best: LiveAmpThread[] = [];
    const finish = () => {
      child.kill("SIGTERM");
      resolve(best);
    };
    const timer = setTimeout(finish, timeoutMs);
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      buffer += chunk;
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line) as { threads?: LiveAmpThread[] };
          if (parsed.threads && parsed.threads.length >= best.length)
            best = parsed.threads;
          if (best.length > 0) {
            clearTimeout(timer);
            finish();
            return;
          }
        } catch {
          // Ignore diagnostic output that is not JSON.
        }
      }
    });
    child.on("error", () => {
      clearTimeout(timer);
      resolve([]);
    });
    // Resolve as soon as `amp top` exits instead of always waiting out the
    // timer — when nothing is live the stream ends quickly.
    child.on("exit", () => {
      clearTimeout(timer);
      resolve(best);
    });
  });
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`;
}

/** Base URL of the Amp deployment; AMP_URL overrides for private installs. */
export function ampBaseURL(): string {
  const value = process.env.AMP_URL?.trim() || "https://ampcode.com/";
  return value.endsWith("/") ? value : `${value}/`;
}

async function readAmpAPIKey(baseURL: string): Promise<string> {
  const environmentKey = process.env.AMP_API_KEY?.trim();
  if (environmentKey) return environmentKey;

  const secretsPath = join(homedir(), ".local", "share", "amp", "secrets.json");
  let secrets: Record<string, string>;
  try {
    secrets = JSON.parse(await readFile(secretsPath, "utf8")) as Record<
      string,
      string
    >;
  } catch {
    throw new Error(
      "Could not read the Amp CLI session. Run `amp login`, then try again.",
    );
  }

  const candidates = [
    `apiKey@${baseURL}`,
    `apiKey@${baseURL.replace(/\/$/, "")}`,
  ];
  for (const key of candidates) {
    const token = secrets[key]?.trim();
    if (token) return token;
  }
  throw new Error("Amp CLI is not logged in. Run `amp login`, then try again.");
}

interface AmpContentBlock {
  type: "text" | "image";
  text?: string;
  sourcePath?: string;
  source?: {
    type: "base64";
    mediaType: string;
    data: string;
  };
}

/** The media types Amp's createRemoteExecutorThread schema accepts. */
const IMAGE_MEDIA_TYPES = new Map([
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".gif", "image/gif"],
  [".webp", "image/webp"],
]);

/** Inlined file contents share the thread's prompt, so keep them modest. */
const MAX_TEXT_ATTACHMENT_BYTES = 1024 * 1024;

/**
 * Amp takes text and image blocks only. Images pass through as-is; every other
 * file is inlined as text, which fails for binaries with no text form.
 */
export async function classifyAttachment(
  path: string,
): Promise<ThreadAttachment> {
  if (IMAGE_MEDIA_TYPES.has(extname(path).toLowerCase())) {
    return { path, kind: "image" };
  }

  const contents = await readFile(path);
  if (contents.byteLength > MAX_TEXT_ATTACHMENT_BYTES) {
    throw new Error(
      `${basename(path)} is too large to attach (${Math.round(contents.byteLength / 1024)} KB). Amp accepts images, or text files up to 1 MB.`,
    );
  }
  if (contents.subarray(0, 8_000).includes(0)) {
    throw new Error(
      `${basename(path)} is a binary file. Amp accepts PNG, JPEG, GIF, and WebP images, or files with text contents.`,
    );
  }
  return { path, kind: "text" };
}

async function attachmentContent(
  attachment: ThreadAttachment,
): Promise<AmpContentBlock> {
  const contents = await readFile(attachment.path);
  if (attachment.kind === "text") {
    return {
      type: "text",
      text: `<attachment name="${basename(attachment.path)}">\n${contents.toString("utf8")}\n</attachment>`,
    };
  }
  return {
    type: "image",
    sourcePath: pathToFileURL(attachment.path).href,
    source: {
      type: "base64",
      mediaType:
        IMAGE_MEDIA_TYPES.get(extname(attachment.path).toLowerCase()) ??
        "image/png",
      data: contents.toString("base64"),
    },
  };
}

interface InternalAPIResponse<T> {
  ok: boolean;
  result?: T;
  error?: { code?: string; message?: string };
}

async function callAmpInternal<T>(
  method: string,
  params: Record<string, unknown>,
): Promise<T> {
  const baseURL = ampBaseURL();
  const apiKey = await readAmpAPIKey(baseURL);
  const url = new URL(`/api/internal?${encodeURIComponent(method)}`, baseURL);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ method, params }),
  });
  if (!response.ok) {
    throw new Error(`Amp API request failed (${response.status})`);
  }
  const body = (await response.json()) as InternalAPIResponse<T>;
  if (!body.ok) {
    throw new Error(
      body.error?.message ?? body.error?.code ?? `Amp ${method} failed`,
    );
  }
  // Void methods (e.g. setThreadMeta) return ok with no result.
  return body.result as T;
}

/**
 * Maps the user-facing visibility to Amp's threadMeta shape (same mapping the
 * CLI's --visibility flag uses). Private is the server default, so it sends no
 * meta at all.
 */
function threadMetaForVisibility(
  visibility?: AmpVisibility,
): Record<string, unknown> | undefined {
  switch (visibility) {
    case "unlisted":
      return { visibility: "public_unlisted" };
    case "workspace":
      return { visibility: "thread_workspace_shared" };
    case "group":
      return { visibility: "private", shareWithAllCreatorGroups: true };
    default:
      return undefined;
  }
}

/** Changes an existing thread's visibility (private is explicit here). */
export async function setThreadVisibility(
  threadId: string,
  visibility: AmpVisibility,
): Promise<void> {
  const meta = threadMetaForVisibility(visibility) ?? {
    visibility: "private",
    sharedGroupIDs: [],
  };
  await callAmpInternal<void>("setThreadMeta", { thread: threadId, meta });
}

export async function launchThread(
  run: TrackedRun,
  prompt: string,
  attachments: ThreadAttachment[],
): Promise<{ threadId: string; url: string }> {
  if (!run.project) {
    throw new Error(
      "Select an Amp Cloud project before starting a thread in an Orb.",
    );
  }
  await mkdir(run.runDirectory, { recursive: true });
  const promptPath = join(run.runDirectory, "prompt.md");
  const inputPath = join(run.runDirectory, "input.jsonl");
  const stderrPath = join(run.runDirectory, "stderr.log");
  const exitPath = join(run.runDirectory, "exit-code");
  const threadIdPath = join(run.runDirectory, "thread-id");
  await writeFile(promptPath, prompt, "utf8");

  const content: AmpContentBlock[] = [
    { type: "text", text: prompt },
    ...(await Promise.all(attachments.map(attachmentContent))),
  ];

  // Amp's thread runtime rejects content over ~2 MB with an opaque 403, so
  // fail here with an actionable message instead.
  const contentBytes = JSON.stringify(content).length;
  if (contentBytes > 1_900_000) {
    const megabytes = (contentBytes / 1024 / 1024).toFixed(1);
    throw new Error(
      `Attachments are too large for Amp: ${megabytes} MB encoded, limit is about 2 MB. Remove some captured windows or attachments and try again.`,
    );
  }
  const input = {
    type: "user",
    message: {
      role: "user",
      content,
    },
  };
  await writeFile(inputPath, `${JSON.stringify(input)}\n`, "utf8");
  await writeFile(stderrPath, "", "utf8");

  try {
    const threadMeta = threadMetaForVisibility(run.visibility);
    const result = await callAmpInternal<{
      threadID: string;
      url: string;
      projectName?: string;
    }>("createRemoteExecutorThread", {
      agentMode: run.mode,
      projectID: run.project.id,
      content,
      ...(threadMeta ? { threadMeta } : {}),
    });
    await writeFile(threadIdPath, `${result.threadID}\n`, "utf8");
    return { threadId: result.threadID, url: result.url };
  } catch (error) {
    await Promise.all([
      writeFile(stderrPath, `${String(error)}\n`, "utf8"),
      writeFile(exitPath, "1\n", "utf8"),
    ]);
    // The runtime's 403 body is an unhelpful "internal error"; oversized
    // content is its usual cause.
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("failed with 403")) {
      throw new Error(
        `Amp refused to start the thread (server 403). This usually means the request was too large (${(contentBytes / 1024 / 1024).toFixed(1)} MB sent) or the project is not accessible. Original error: ${message}`,
      );
    }
    throw error;
  }
}

export async function readRunState(
  run: TrackedRun,
): Promise<{ threadId?: string; exitCode?: number; error?: string }> {
  const readOptional = async (name: string) => {
    try {
      return (await readFile(join(run.runDirectory, name), "utf8")).trim();
    } catch {
      return undefined;
    }
  };
  const [threadId, exit, error] = await Promise.all([
    readOptional("thread-id"),
    readOptional("exit-code"),
    readOptional("stderr.log"),
  ]);
  return {
    threadId,
    exitCode: exit === undefined ? undefined : Number(exit),
    error: error || undefined,
  };
}

async function makeTerminalCommand(
  supportPath: string,
  threadId: string,
): Promise<string> {
  const amp = await findAmp();
  const path = join(supportPath, `open-${threadId}.command`);
  const contents = `#!/bin/zsh
export AMP_USE_FILE_BASED_SECRETS=1
exec ${shellQuote(amp)} threads continue ${shellQuote(threadId)}
`;
  await writeFile(path, contents, "utf8");
  await chmod(path, 0o700);
  return path;
}

export async function makeAttachCommand(threadId: string): Promise<string> {
  const amp = await findAmp();
  return `${shellQuote(amp)} threads continue ${shellQuote(threadId)}`;
}

export async function openThreadInTerminal(
  supportPath: string,
  threadId: string,
): Promise<void> {
  const command = await makeTerminalCommand(supportPath, threadId);
  const terminalApp = getPreferenceValues<Preferences>().terminalApp;
  const terminalIdentity = [
    terminalApp?.name,
    terminalApp?.path,
    terminalApp?.bundleId,
  ]
    .filter(Boolean)
    .join(" ");
  // Ghostty ignores documents passed to `open`, but accepts a command to run
  // via its -e flag on a fresh instance.
  if (/ghostty/i.test(terminalIdentity)) {
    const child = spawn(
      "/usr/bin/open",
      ["-na", terminalApp?.path ?? "Ghostty.app", "--args", "-e", command],
      { detached: true, stdio: "ignore" },
    );
    child.unref();
    return;
  }
  await open(command, terminalApp?.path);
}
