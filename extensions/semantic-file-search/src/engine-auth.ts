/** Credentials are created by the engine and shared by both launchers. */
import {
  lstat,
  readFile,
  mkdtemp,
  writeFile,
  rm,
  stat,
  chmod,
} from "node:fs/promises";
import { execFile } from "node:child_process";
import { homedir, tmpdir } from "node:os";
import { isAbsolute, join } from "node:path";

export const sharedStorage = join(
  homedir(),
  "Library",
  "Application Support",
  "Semantic Search",
);
const isTinycast = () => "tinycast" in process.versions;
export const engineTokenHeader = "X-Semantic-Search-Token";
export class EngineTokenMissing extends Error {
  constructor(path: string) {
    super(
      `The local engine has not created its authentication file. Install or start the current engine with its configured storage, then check the installation again. Expected token file: ${path}.`,
    );
  }
}

export function validateEngineURL(input: string): void {
  const url = new URL(input);
  if (
    url.protocol !== "http:" ||
    !["127.0.0.1", "localhost"].includes(url.hostname) ||
    url.username ||
    url.password
  )
    throw new Error("Engine requests must use a local HTTP address.");
}

const customTokens = new Map<string, string>();
export function configureEngineToken(base: string, tokenPath = ""): void {
  validateEngineURL(base);
  const origin = new URL(base).origin;
  const expanded = tokenPath.startsWith("~/")
    ? join(homedir(), tokenPath.slice(2))
    : tokenPath;
  if (expanded && (!isAbsolute(expanded) || expanded.includes("\0")))
    throw new Error(
      "The custom engine token file must use an absolute path or ~/ path.",
    );
  customTokens.clear();
  if (expanded) customTokens.set(origin, expanded);
}

export async function readEngineToken(
  storage = sharedStorage,
): Promise<string> {
  return readEngineTokenFile(join(storage, "auth-token"));
}

async function readEngineTokenFile(path: string): Promise<string> {
  try {
    const details = await lstat(path);
    if (
      !details.isFile() ||
      !Number.isSafeInteger(details.mode) ||
      (details.mode & 0o077) !== 0
    )
      throw new Error("The engine authentication file must be private (0600).");
    if (process.getuid && details.uid !== process.getuid())
      throw new Error(
        "The engine authentication file belongs to another user.",
      );
    if (!Number.isSafeInteger(details.size) || details.size > 66)
      throw new Error("The engine authentication file is invalid.");
    const token = (await readFile(path, "utf8")).trim();
    if (!/^[a-f0-9]{64}$/.test(token))
      throw new Error("The engine authentication file is invalid.");
    return token;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT")
      throw new EngineTokenMissing(path);
    throw error;
  }
}

export async function engineFetch(
  input: string,
  init: RequestInit = {},
  storage?: string,
): Promise<Response> {
  validateEngineURL(input);
  const configured =
    storage === undefined ? customTokens.get(new URL(input).origin) : undefined;
  const token = configured
    ? await readEngineTokenFile(configured)
    : await readEngineToken(storage);
  const source = init.headers;
  const headers: Record<string, string> = {};
  const addHeader = (name: string, value: string) => {
    if (name.toLowerCase() !== engineTokenHeader.toLowerCase())
      headers[name] = value;
  };
  if (Array.isArray(source)) {
    for (const [name, value] of source) addHeader(name, value);
  } else if (source && typeof (source as Headers).forEach === "function") {
    (source as Headers).forEach((value, name) => addHeader(name, value));
  } else {
    for (const [name, value] of Object.entries(source || {}))
      addHeader(name, value);
  }
  headers[engineTokenHeader] = token;
  const response = isTinycast()
    ? await engineCurlFetch(input, { ...init, headers })
    : await fetch(input, { ...init, headers, redirect: "error" });
  if (response.status === 401)
    throw new Error(
      "The local engine rejected its authentication token. Restart the engine and check the installation again.",
    );
  return response;
}

/** Tinycast's fetch bridge ignores redirect policies, so keep credentials in curl's private config. */
export async function engineCurlFetch(
  input: string,
  init: RequestInit,
): Promise<Response> {
  validateEngineURL(input);
  init.signal?.throwIfAborted();
  const directory = await mkdtemp(join(tmpdir(), "semantic-engine-request-"));
  const output = join(directory, "response");
  const config = join(directory, "request.conf");
  const quote = (value: string) =>
    `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r/g, "\\r").replace(/\n/g, "\\n").replace(/\t/g, "\\t")}"`;
  try {
    await chmod(directory, 0o700);
    let settings = "";
    for (const [name, value] of Object.entries(init.headers || {})) {
      if (
        !/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(name) ||
        /[\r\n]/.test(String(value))
      )
        throw new Error("Invalid engine request header.");
      settings += `header = ${quote(`${name}: ${value}`)}\n`;
    }
    const args = [
      "--disable",
      "--silent",
      "--show-error",
      "--no-location",
      "--max-redirs",
      "0",
      "--noproxy",
      "*",
      "--proto",
      "=http",
      "--connect-timeout",
      "5",
      "--max-time",
      "120",
      "--max-filesize",
      String(32 * 1024 * 1024),
      "--config",
      config,
      "--output",
      output,
      "--write-out",
      "%{http_code}",
      "--request",
      init.method || "GET",
      "--url",
      input,
    ];
    if (init.body != null) {
      if (typeof init.body !== "string")
        throw new Error("Invalid engine request body.");
      const body = join(directory, "body");
      await writeFile(body, init.body, { mode: 0o600 });
      await chmod(body, 0o600);
      args.push("--data-binary", `@${body}`);
    }
    await writeFile(config, settings, { mode: 0o600 });
    await chmod(config, 0o600);
    await writeFile(output, "", { mode: 0o600 });
    await chmod(output, 0o600);
    let child: ReturnType<typeof execFile> | undefined;
    const abort = () => child?.kill("SIGTERM");
    init.signal?.addEventListener("abort", abort);
    let stdout: string;
    try {
      stdout = await new Promise<string>((resolve, reject) => {
        child = execFile(
          "/usr/bin/curl",
          args,
          { timeout: 125_000, maxBuffer: 16 * 1024 },
          (error, output) => {
            if (init.signal?.aborted)
              reject(
                init.signal.reason ||
                  new Error("The engine request was aborted."),
              );
            else if (error) reject(error);
            else resolve(output);
          },
        );
        if (init.signal?.aborted) abort();
      });
    } finally {
      init.signal?.removeEventListener("abort", abort);
    }
    init.signal?.throwIfAborted();
    if (!/^\d{3}$/.test(stdout.trim()))
      throw new Error("Invalid engine response.");
    const status = Number(stdout.trim());
    if (status >= 300 && status < 400)
      throw new Error("The local engine returned an unexpected redirect.");
    if ((await stat(output)).size > 32 * 1024 * 1024)
      throw new Error("The engine response is too large.");
    const body = await readFile(output, "utf8");
    return new Response([204, 205, 304].includes(status) ? null : body, {
      status,
    });
  } catch (error) {
    init.signal?.throwIfAborted();
    // curl errors contain argv with paths and URL, never config contents or tokens.
    if ((error as { code?: unknown }).code != null)
      throw new Error(
        "Could not connect to the local engine. Check its installation and try again.",
      );
    throw error;
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
