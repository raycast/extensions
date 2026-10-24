import { vi } from "vitest";
import { Deps, RunOptions, RunResult } from "../src/lib/deps";

// A stand-in for everything outside the providers: files, sqlite, the network and the clock. Tests describe the Mac's
// files and the providers' HTTP answers, then read `requests` to check what was sent. Nothing real is touched.

export interface FakeResponse {
  status?: number;
  // Sent as JSON when it is not a string.
  body: unknown;
  headers?: Record<string, string>;
}

export interface RecordedRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
}

// A route answers every request whose URL starts with `prefix` (and whose method matches, when given). A function
// route can look at the request, for example to answer differently on a retry.
export interface Route {
  prefix: string;
  method?: string;
  respond: FakeResponse | ((request: RecordedRequest) => FakeResponse);
}

export const NOW = Date.parse("2026-10-14T12:00:00Z");
export const HOME = "/Users/tester";

export interface FakeDeps extends Deps {
  files: Map<string, string>;
  routes: Route[];
  requests: RecordedRequest[];
  // Answers sqlite(dbPath, sql) calls, keyed by dbPath. A missing key throws like an unopenable database.
  sqliteResults: Map<string, string>;
  sqliteCalls: { dbPath: string; sql: string }[];
  // Answers run(file, args) calls. The first handler whose `file` matches answers; a call with no handler rejects like
  // a program that doesn't exist.
  programs: FakeProgram[];
  runCalls: { file: string; args: string[]; options?: RunOptions }[];
  // Paths isExecutable() reports as executable.
  executables: Set<string>;
}

export interface FakeProgram {
  file: string;
  respond: RunResult | ((args: string[], options?: RunOptions) => RunResult | Promise<RunResult>);
}

export function fakeDeps(options: { files?: Record<string, string>; routes?: Route[] } = {}): FakeDeps {
  const files = new Map(Object.entries(options.files ?? {}));
  const routes = [...(options.routes ?? [])];
  const requests: RecordedRequest[] = [];
  const sqliteResults = new Map<string, string>();
  const sqliteCalls: { dbPath: string; sql: string }[] = [];
  const programs: FakeProgram[] = [];
  const runCalls: { file: string; args: string[]; options?: RunOptions }[] = [];
  const executables = new Set<string>();

  const fetchFake = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    const request: RecordedRequest = {
      url,
      method: init?.method ?? "GET",
      headers: Object.fromEntries(new Headers(init?.headers).entries()),
      body: typeof init?.body === "string" ? init.body : undefined,
    };
    requests.push(request);
    const route = routes.find((r) => url.startsWith(r.prefix) && (!r.method || r.method === request.method));
    if (!route) {
      throw new TypeError(`fetch failed: no fake route for ${request.method} ${url}`);
    }
    const answer = typeof route.respond === "function" ? route.respond(request) : route.respond;
    const text = typeof answer.body === "string" ? answer.body : JSON.stringify(answer.body);
    return new Response(text, { status: answer.status ?? 200, headers: answer.headers });
  });

  return {
    files,
    routes,
    requests,
    sqliteResults,
    sqliteCalls,
    programs,
    runCalls,
    executables,
    fetch: fetchFake as unknown as typeof fetch,
    readFile: async (path) => files.get(path) ?? null,
    // A directory exists when a fake file lives under it. Lists its direct children.
    listDir: async (path) => {
      const prefix = path.endsWith("/") ? path : `${path}/`;
      const names = new Set<string>();
      for (const file of files.keys()) {
        if (file.startsWith(prefix)) {
          names.add(file.slice(prefix.length).split("/")[0]);
        }
      }
      return names.size > 0 ? [...names].sort() : null;
    },
    sqlite: async (dbPath, sql) => {
      sqliteCalls.push({ dbPath, sql });
      const result = sqliteResults.get(dbPath);
      if (result === undefined) {
        throw new Error(`Error: unable to open database "${dbPath}": unable to open database file`);
      }
      return result;
    },
    run: async (file, args, options) => {
      runCalls.push({ file, args, options });
      const program = programs.find((candidate) => candidate.file === file);
      if (!program) {
        throw Object.assign(new Error(`spawn ${file} ENOENT`), { code: "ENOENT" });
      }
      return typeof program.respond === "function" ? program.respond(args, options) : program.respond;
    },
    isExecutable: async (path) => executables.has(path),
    platform: "darwin",
    homedir: HOME,
    env: {},
    now: () => NOW,
  };
}

// Builds an unsigned JWT with the given payload, for providers that read claims from tokens.
export function fakeJwt(payload: Record<string, unknown>): string {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "none", typ: "JWT" })}.${encode(payload)}.signature`;
}
