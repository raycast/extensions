/**
 * `addTap` decides trust from what brew reads back after tapping. These run
 * the real `confirmAndRun` and `execBrew` against a faked shell, so the trust
 * command either reaches the shell or it does not.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { __logs } from "../__mocks__/raycast-logger";
import { __raycast } from "../__mocks__/raycast-api";
import { addTap } from "./addTap";

const shell = vi.hoisted(() => ({
  runs: [] as string[],
  /** stdout for a command, or throw to fail it. */
  answer: (command: string): string => {
    void command;
    return "";
  },
}));

vi.mock("child_process", () => ({
  // `execBrew` promisifies this. The real `exec` resolves `{ stdout, stderr }`;
  // a plain function resolves only the value after the error, so pass that shape.
  exec: (
    command: string,
    _options: unknown,
    callback: (err: Error | null, out?: { stdout: string; stderr: string }) => void,
  ) => {
    shell.runs.push(command);
    try {
      callback(null, { stdout: shell.answer(command), stderr: "" });
    } catch (err) {
      callback(err as Error);
    }
    return {};
  },
  // Imported on the way in by the preflight's git reader, never called here.
  execFile: () => {
    throw new Error("unexpected git call");
  },
}));
vi.mock("fs/promises", () => ({ access: async () => {}, chmod: async () => {} }));
vi.mock("./paths", () => ({ brewPath: () => "/opt/homebrew/bin", brewExecutable: () => "/opt/homebrew/bin/brew" }));

/** `brew tap-info` for a tap holding these formulae. */
const tapInfo = (name: string, formulae: string[]) =>
  JSON.stringify([
    {
      name,
      user: name.split("/")[0],
      repo: name.split("/")[1],
      path: `/opt/homebrew/Library/Taps/${name}`,
      installed: true,
      official: false,
      formula_names: formulae.map((f) => `${name}/${f}`),
      cask_tokens: [],
      command_files: [],
      remote: null,
      last_commit: null,
    },
  ]);

const options = { trust: true, title: "Add?", message: "", confirmTitle: "Add Tap" };
const trustRan = () => shell.runs.some((command) => command.includes("trust --tap"));
const titles = () => __raycast.toasts.map((toast) => toast.title);

beforeEach(() => {
  __logs.length = 0;
  __raycast.reset();
  shell.runs.length = 0;
  shell.answer = () => "";
});

describe("addTap", () => {
  it("trusts a tap once brew lists packages in it", async () => {
    shell.answer = (command) => (command.includes("tap-info") ? tapInfo("acme/tools", ["frob"]) : "");
    await addTap({ tap: "acme/tools" }, options, () => {});
    expect(trustRan()).toBe(true);
    expect(titles()).toContain("Added acme/tools: 1 formula");
  });

  it("adds an empty tap without trusting it, and logs the trust step as skipped", async () => {
    shell.answer = (command) => (command.includes("tap-info") ? tapInfo("acme/empty", []) : "");
    await addTap({ tap: "acme/empty" }, options, () => {});
    expect(trustRan()).toBe(false);
    expect(__logs.map((log) => log.message)).toContain("Command skipped");
    expect(titles()).toContain("No packages found in acme/empty");
  });

  it("withholds trust when the read-back fails", async () => {
    shell.answer = (command) => {
      if (command.includes("tap-info")) throw new Error("tap-info failed");
      return "";
    };
    await addTap({ tap: "acme/tools" }, options, () => {});
    expect(trustRan()).toBe(false);
    expect(titles()).toContain("Added acme/tools without trusting it");
  });

  it("never schedules trust for Add Anyway", async () => {
    shell.answer = (command) => (command.includes("tap-info") ? tapInfo("acme/tools", ["frob"]) : "");
    await addTap({ tap: "acme/tools" }, { ...options, trust: false }, () => {});
    expect(trustRan()).toBe(false);
  });
});
