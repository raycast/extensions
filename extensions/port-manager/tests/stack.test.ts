import { mkdir, mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { getProcessIcon } from "../src/utilities/getProcessIcon";
import { CommandExitError, runCommand } from "../src/utilities/runCommand";
import {
  detectRuntime,
  detectStack,
  executableName,
  frameworkFromCommand,
  readNearestDependencies,
  stackIcon,
} from "../src/utilities/stack";
import { getWorkingDirectories, parseWorkingDirectories } from "../src/utilities/workingDirectories";

vi.mock("../src/utilities/runCommand", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/utilities/runCommand")>()),
  runCommand: vi.fn(),
}));
const command = vi.mocked(runCommand);

let root: string;

async function project(name: string, dependencies: Record<string, string>, devDependencies = {}) {
  const directory = path.join(root, name);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, "package.json"), JSON.stringify({ dependencies, devDependencies }));
  return directory;
}

beforeAll(async () => {
  root = await mkdtemp(path.join(tmpdir(), "port-manager-stack-"));
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("runtime detection", () => {
  it.each([
    [{ path: "/opt/homebrew/bin/node" }, "Node.js"],
    [{ path: "C:\\Program Files\\nodejs\\node.exe" }, "Node.js"],
    [{ name: "next-server (v15.1.0)" }, "Node.js"],
    [{ path: "/Users/me/.bun/bin/bun" }, "Bun"],
    [
      { path: "/Library/Frameworks/Python.framework/Versions/3.12/Resources/Python.app/Contents/MacOS/Python" },
      "Python",
    ],
    [{ path: "/usr/bin/python3.12" }, "Python"],
    [{ name: "puma 6.4.0 (tcp://localhost:3000) [app]" }, "Ruby"],
    [{ path: "/opt/homebrew/opt/postgresql@16/bin/postgres" }, "PostgreSQL"],
    [{ path: "/opt/homebrew/bin/redis-server" }, "Redis"],
    [{ name: "com.docker.backend" }, "Docker"],
  ])("identifies %o as %s", (source, runtime) => {
    expect(detectRuntime(source)?.name).toBe(runtime);
  });

  it("returns nothing for an unknown executable", () => {
    expect(detectRuntime({ path: "/Applications/Raycast.app/Contents/MacOS/Raycast" })).toBeUndefined();
    expect(detectRuntime({})).toBeUndefined();
  });

  it("prefers the executable path over a retitled name", () => {
    expect(executableName({ name: "something else", path: "/usr/local/bin/node" })).toBe("node");
  });
});

describe("framework detection from the command line", () => {
  it.each([
    ["node /app/node_modules/.bin/astro dev", "Astro"],
    ["node /app/node_modules/next/dist/server/lib/start-server.js", "Next.js"],
    ["node /app/node_modules/@sveltejs/kit/src/cli.js", "SvelteKit"],
    ['"C:\\Program Files\\nodejs\\node.exe" "C:\\app\\node_modules\\vite\\bin\\vite.js"', "Vite"],
    ["C:\\app\\node_modules\\.bin\\nuxi.cmd dev", "Nuxt"],
    ["python manage.py runserver", "Django"],
    ["/usr/bin/python3 -m uvicorn main:app", "FastAPI"],
  ])("finds the framework in %s", (commandLine, framework) => {
    expect(frameworkFromCommand(commandLine)?.name).toBe(framework);
  });

  it("ignores scripts that are not frameworks and inherited object keys", () => {
    expect(frameworkFromCommand("node dist/server.js")).toBeUndefined();
    expect(frameworkFromCommand("node constructor toString")).toBeUndefined();
  });
});

describe("stack detection", () => {
  it("reads the nearest package.json, so a workspace app wins over the root", async () => {
    await project("monorepo", { hono: "1" });
    const app = await project("monorepo/apps/api", { express: "4" }, { typescript: "5" });
    const nested = path.join(app, "src");
    await mkdir(nested, { recursive: true });

    expect(await readNearestDependencies(nested, root)).toEqual(new Set(["express", "typescript"]));
  });

  it("stops looking at the boundary", async () => {
    const empty = path.join(root, "empty/deep");
    await mkdir(empty, { recursive: true });
    expect(await readNearestDependencies(empty, path.join(root, "empty"))).toEqual(new Set());
  });

  it("names the library behind a plain Node server, checking NestJS before Express", async () => {
    const nest = await project("nest", { "@nestjs/core": "10", express: "4" });
    const stack = await detectStack({ path: "/usr/local/bin/node", commandLine: "node dist/main.js" }, nest);
    expect(stack).toMatchObject({ runtime: { name: "Node.js" }, framework: { name: "NestJS" } });
  });

  it("narrows Vite to the meta-framework in the project's dependencies", async () => {
    const kit = await project("kit", { "@sveltejs/kit": "2", vite: "6" });
    const commandLine = "node /app/node_modules/.bin/vite dev";
    expect((await detectStack({ name: "node", commandLine }, kit)).framework?.name).toBe("SvelteKit");
    expect((await detectStack({ name: "node", commandLine })).framework?.name).toBe("Vite");
  });

  it("keeps a framework found in the command line without reading dependencies", async () => {
    const app = await project("astro-site", { express: "4" });
    const stack = await detectStack({ name: "node", commandLine: "node node_modules/.bin/astro dev" }, app);
    expect(stack.framework?.name).toBe("Astro");
  });

  it("does not look for frameworks behind compiled servers", async () => {
    const stack = await detectStack({ path: "/opt/homebrew/bin/redis-server", commandLine: "redis-server vite" });
    expect(stack).toEqual({ runtime: expect.objectContaining({ name: "Redis" }) });
    expect(await detectStack({ name: "Raycast", commandLine: "vite" })).toEqual({ runtime: undefined });
  });

  it("detects Python frameworks without a working directory", async () => {
    const stack = await detectStack({ name: "python3", commandLine: "python3 -m flask run" });
    expect(stack.framework?.name).toBe("Flask");
  });
});

describe("icons", () => {
  it("adds a dark variant only for dark logos", () => {
    expect(stackIcon({ name: "Node.js", icon: "nodedotjs" })).toBe("stack/nodedotjs.svg");
    expect(stackIcon({ name: "Bun", icon: "bun" })).toEqual({
      source: { light: "stack/bun.svg", dark: "stack/bun-dark.svg" },
    });
  });

  it("prefers the framework, then the runtime, then the app or executable", () => {
    const node = { name: "Node.js", icon: "nodedotjs" };
    const vite = { name: "Vite", icon: "vite" };
    expect(getProcessIcon({}, { runtime: node, framework: vite })).toBe("stack/vite.svg");
    expect(getProcessIcon({}, { runtime: node })).toBe("stack/nodedotjs.svg");
    expect(getProcessIcon({ path: "/Applications/Raycast.app/Contents/MacOS/Raycast" }, {})).toEqual({
      fileIcon: "/Applications/Raycast.app",
    });
    expect(getProcessIcon({ path: "C:\\Tools\\server.exe" }, undefined)).toEqual({ fileIcon: "C:\\Tools\\server.exe" });
    expect(getProcessIcon({ path: "/usr/sbin/sshd" }, undefined)).toBe("terminal");
  });
});

describe("working directories", () => {
  beforeEach(() => {
    command.mockReset();
    vi.spyOn(process, "platform", "get").mockReturnValue("darwin");
  });

  it("parses lsof field output", () => {
    expect(parseWorkingDirectories("p42\nfcwd\nn/Users/me/app\np43\nfcwd\nn\np44\nfcwd\nn/tmp")).toEqual(
      new Map([
        [42, "/Users/me/app"],
        [44, "/tmp"],
      ]),
    );
  });

  it("looks up every PID in one call", async () => {
    command.mockResolvedValue({ stdout: "p42\nn/Users/me/app\n", stderr: "" });
    expect(await getWorkingDirectories([42, 42, 0, 7])).toEqual(new Map([[42, "/Users/me/app"]]));
    expect(command).toHaveBeenCalledTimes(1);
    expect(command.mock.calls[0][1]).toEqual(["-a", "-d", "cwd", "-Fn", "-p", "42,7"]);
  });

  it("keeps partial output when lsof exits 1", async () => {
    command.mockRejectedValue(new CommandExitError("/usr/sbin/lsof", [], "p42\nn/app\n", "", 1, null));
    expect(await getWorkingDirectories([42, 43])).toEqual(new Map([[42, "/app"]]));
  });

  it("returns nothing when lsof cannot run", async () => {
    command.mockRejectedValue(new Error("timed out"));
    expect(await getWorkingDirectories([42])).toEqual(new Map());
  });

  it("skips the lookup on Windows and without PIDs", async () => {
    expect(await getWorkingDirectories([])).toEqual(new Map());
    vi.spyOn(process, "platform", "get").mockReturnValue("win32");
    expect(await getWorkingDirectories([42])).toEqual(new Map());
    expect(command).not.toHaveBeenCalled();
  });
});
