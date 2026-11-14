import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { createContext, runInContext } from "node:vm";

export interface RenderNode {
  type: string;
  props?: Record<string, unknown>;
  children?: RenderNode[];
}

export const runtimePath =
  process.env.TINYCAST_RUNTIME_PATH ?? "/Applications/Tinycast.app/Contents/Resources/RaycastRuntime.generated.js";

export function nodes(tree: RenderNode): RenderNode[] {
  const slots = Object.values(tree.props ?? {}).filter(
    (value): value is RenderNode =>
      typeof value === "object" && value !== null && "type" in value && typeof value.type === "string",
  );
  return [tree, ...(tree.children ?? []).flatMap(nodes), ...slots.flatMap(nodes)];
}

// Use the user's installed Tinycast runtime, not a mock of @raycast/api. Process output is
// deliberately delivered only after exit, matching the documented compatibility limitation.
export function tinycastHarness(
  displayMode = "both",
  commandName = "usage",
  caches: Record<string, Record<string, string>> = {},
  preferenceOverrides: Record<string, unknown> = {},
) {
  const directory = resolve("dist");
  const manifest: { commands: { name: string; mode: string }[] } = JSON.parse(
    readFileSync(join(directory, "package.json"), "utf8"),
  );
  const mode = manifest.commands.find((command) => command.name === commandName)?.mode;
  assert.ok(mode, `Missing command: ${commandName}`);
  const fixture = resolve("tests/fixtures/app-server.mjs");
  const context = createContext({});
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  const children = new Map<number, Promise<Record<string, unknown>>>();
  const calls: string[] = [];
  const requests: { name: string; args: unknown[] }[] = [];
  const callWaiters = new Set<{ name: string; resolve: (args: unknown[]) => void }>();
  const failures: string[] = [];
  const logs: string[] = [];
  const waiters = new Set<{ predicate: (tree: RenderNode) => boolean; resolve: (tree: RenderNode) => void }>();
  let tree: RenderNode | undefined;
  let scenario = "success";

  function recordCall(api: string, method: string, args: unknown[]) {
    const name = `${api}.${method}`;
    calls.push(name);
    requests.push({ name, args });
    for (const waiter of callWaiters) {
      if (waiter.name === name) {
        callWaiters.delete(waiter);
        waiter.resolve(args);
      }
    }
  }

  function processResult(spec: Record<string, unknown>) {
    assert.equal(spec.command, join(directory, "assets/codex-usage-helper"));
    assert.deepEqual(spec.args, [process.execPath, "20000", "app-server"]);
    const child = spawn(String(spec.command), [process.execPath, "2000", fixture, scenario], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    const result = new Promise<Record<string, unknown>>((resolve, reject) => {
      child.once("error", reject);
      child.once("close", (status, signal) =>
        resolve({
          stdout: Buffer.from(stdout).toString("base64"),
          stderr: Buffer.from(stderr).toString("base64"),
          status: status ?? 1,
          signal,
        }),
      );
    });
    return { pid: child.pid!, result };
  }

  function syncCall(api: string, method: string, args: unknown[]) {
    recordCall(api, method, args);
    if (api === "crypto" && method === "hash") {
      return createHash(String(args[0]))
        .update(Buffer.from(String(args[1]), "base64"))
        .digest("base64");
    }
    if (api === "fs" && method === "exists") return existsSync(String(args[0]));
    if (api === "fs" && method === "readFile") return readFileSync(String(args[0])).toString("base64");
    if (api === "proc" && method === "start") {
      const process = processResult(args[0] as Record<string, unknown>);
      children.set(process.pid, process.result);
      return process.pid;
    }
    if (api === "proc" && method === "kill") {
      process.kill(Number(args[0]), Number(args[1]));
      return null;
    }
    throw new Error(`Unimplemented Tinycast test host call: ${api}.${method}`);
  }

  async function asyncCall(api: string, method: string, args: unknown[]) {
    recordCall(api, method, args);
    if (api === "proc" && method === "run") return processResult(args[0] as Record<string, unknown>).result;
    if (api === "proc" && method === "wait") {
      const pid = Number(args[0]);
      const result = await children.get(pid);
      children.delete(pid);
      return result;
    }
    if (api === "proc" && method === "read") throw new Error("Live process output is intentionally unavailable.");
    if (api === "cache" || api === "storage") return method === "all" ? {} : null;
    if (api === "system" && (method === "open" || method === "launchCommand")) return null;
    throw new Error(`Unimplemented Tinycast test host call: ${api}.${method}`);
  }

  context.__tinycastHost = {
    log: (_level: string, message: string) => logs.push(message),
    render: (_id: string, json: string) => {
      tree = JSON.parse(json) as RenderNode;
      for (const waiter of waiters) {
        if (waiter.predicate(tree)) {
          waiters.delete(waiter);
          waiter.resolve(tree);
        }
      }
    },
    failed: (_id: string, message: string) => failures.push(message),
    navigationDepthChanged: () => undefined,
    finished: () => undefined,
    fieldCommand: () => undefined,
    startTimer: (id: string, ms: number, repeats: boolean) => {
      const fire = () => runInContext(`__tinycast.fireTimer(${JSON.stringify(id)})`, context);
      timers.set(id, repeats ? setInterval(fire, Math.max(ms, 1)) : setTimeout(fire, ms));
    },
    clearTimer: (id: string) => {
      const timer = timers.get(id);
      clearTimeout(timer);
      clearInterval(timer);
      timers.delete(id);
    },
    invokeSync: (api: string, method: string, json: string) => {
      try {
        return JSON.stringify({ ok: true, value: syncCall(api, method, JSON.parse(json)) });
      } catch (error) {
        return JSON.stringify({ ok: false, error: String(error) });
      }
    },
    invoke: (id: string, api: string, method: string, json: string) => {
      asyncCall(api, method, JSON.parse(json)).then(
        (value) =>
          runInContext(
            `__tinycast.settle(${JSON.stringify(String(id))}, true, ${JSON.stringify(JSON.stringify(value ?? null))})`,
            context,
          ),
        (error: Error) =>
          runInContext(
            `__tinycast.settle(${JSON.stringify(String(id))}, false, ${JSON.stringify(JSON.stringify(error.message))})`,
            context,
          ),
      );
    },
  };
  context.__tinycastCompile = (code: string, filename: string) =>
    runInContext(`(function(exports, require, module, __filename, __dirname) {\n${code}\n})`, context, { filename });
  runInContext(readFileSync(runtimePath, "utf8"), context, { filename: runtimePath });

  const boot = {
    node: { arch: process.arch, env: { HOME: homedir(), PATH: "/usr/bin:/bin" }, cwd: homedir(), homedir: homedir() },
    environment: {
      extensionName: "chatgpt-usage",
      commandName,
      commandMode: mode,
      assetsPath: join(directory, "assets"),
      supportPath: directory,
      isDevelopment: false,
      raycastVersion: "2.7.3",
      textSize: "medium",
      appearance: "dark",
      launchType: "userInitiated",
    },
    preferences: { codexPath: process.execPath, displayMode, ...preferenceOverrides },
    caches,
  };
  runInContext(`__tinycast.boot(${JSON.stringify(JSON.stringify(boot))})`, context);

  function action(current: RenderNode, title: string) {
    const item = nodes(current).find((node) => node.props?.title === title);
    const handler = item?.props?.onAction as { $fn?: string } | undefined;
    assert.ok(handler?.$fn, `${title} must have a Tinycast action handler`);
    runInContext(`__tinycast.dispatch("usage-test", ${JSON.stringify(handler.$fn)}, "[]")`, context);
  }

  return {
    calls,
    requests,
    failures,
    logs,
    setScenario(value: string) {
      scenario = value;
    },
    start() {
      const file = join(directory, `${commandName}.js`);
      runInContext(
        `__tinycast.start("usage-test", ${JSON.stringify(readFileSync(file, "utf8"))}, ${JSON.stringify(file)}, ${JSON.stringify(directory)}, ${JSON.stringify(mode)}, "{}")`,
        context,
      );
    },
    waitFor(predicate: (tree: RenderNode) => boolean): Promise<RenderNode> {
      if (tree && predicate(tree)) return Promise.resolve(tree);
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          waiters.delete(waiter);
          reject(
            new Error(
              `Tinycast render timed out. Failures: ${failures.join("; ")}. Logs: ${logs.join("; ")}. Tree: ${JSON.stringify(tree)}`,
            ),
          );
        }, 5000);
        const waiter = {
          predicate,
          resolve: (result: RenderNode) => {
            clearTimeout(timeout);
            resolve(result);
          },
        };
        waiters.add(waiter);
      });
    },
    action,
    waitForCall(name: string): Promise<unknown[]> {
      const request = requests.find((request) => request.name === name);
      if (request) return Promise.resolve(request.args);
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          callWaiters.delete(waiter);
          reject(new Error(`No Tinycast host call: ${name}`));
        }, 5000);
        const waiter = {
          name,
          resolve: (args: unknown[]) => {
            clearTimeout(timeout);
            resolve(args);
          },
        };
        callWaiters.add(waiter);
      });
    },
    refresh(current: RenderNode) {
      action(current, "Refresh Usage");
    },
    stop() {
      runInContext('__tinycast.stop("usage-test")', context);
      for (const timer of timers.values()) {
        clearTimeout(timer);
        clearInterval(timer);
      }
      timers.clear();
    },
  };
}
