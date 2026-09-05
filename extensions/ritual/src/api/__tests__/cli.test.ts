import { homedir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  CANDIDATE_PATHS,
  discoverBinary,
  makeCli,
  pendingSyncNote,
  RitualCliError,
  withJSON,
} from "../cli";

describe("withJSON", () => {
  it("appends --json when there is no terminator", () => {
    expect(withJSON(["list", "--today"])).toEqual([
      "list",
      "--today",
      "--json",
    ]);
  });

  it("inserts --json BEFORE a -- terminator", () => {
    // swift-argument-parser stops recognizing flags past `--`, so an appended
    // --json is read as a second positional and the command fails.
    expect(withJSON(["search", "--", "-weird query"])).toEqual([
      "search",
      "--json",
      "--",
      "-weird query",
    ]);
  });

  it("does not add a second --json", () => {
    expect(withJSON(["list", "--json"])).toEqual(["list", "--json"]);
  });

  it("still inserts --json when a positional after -- happens to be that string", () => {
    // The idempotence check must look only at the flag region. Scanning the
    // whole array made a search for the literal text "--json" skip the flag,
    // and the CLI then answered in human text.
    expect(withJSON(["search", "--", "--json"])).toEqual([
      "search",
      "--json",
      "--",
      "--json",
    ]);
  });
});

describe("CANDIDATE_PATHS", () => {
  it("never probes Contents/MacOS inside Ritual.app", () => {
    // macOS filesystems are case-insensitive, so any path ending in
    // `Ritual.app/Contents/MacOS/ritual` resolves to the menu bar GUI app's
    // own executable. It passes an executable check, so discovery accepted it
    // and every CLI call launched a copy of the Mac app that never exited.
    // The CLI is legitimately embedded elsewhere in the bundle now
    // (Contents/Helpers), which is why this forbids the dangerous
    // Contents/MacOS form specifically rather than the whole bundle.
    for (const path of CANDIDATE_PATHS) {
      expect(path.toLowerCase()).not.toContain("ritual.app/contents/macos");
    }
  });

  it("prefers the CLI embedded in the app bundle", () => {
    // RitualBar's build embeds its own `ritual` build at Contents/Helpers, so
    // installing/updating the app keeps this copy current by construction —
    // unlike ~/bin/ritual, which used to be installed independently and
    // could silently run weeks-old code against a migrated store.
    expect(CANDIDATE_PATHS[0]).toBe(
      "/Applications/Ritual.app/Contents/Helpers/ritual",
    );
  });

  it("falls back to the path the installer symlinks", () => {
    expect(CANDIDATE_PATHS[1]).toBe(join(homedir(), "bin", "ritual"));
  });
});

describe("discoverBinary", () => {
  const exists = (present: string[]) => (p: string) => present.includes(p);

  it("prefers a preference override that exists", () => {
    const found = discoverBinary(
      "/custom/ritual",
      exists(["/custom/ritual", "/a"]),
      ["/a"],
    );
    expect(found).toBe("/custom/ritual");
  });

  it("ignores an override that does not exist and falls through", () => {
    const found = discoverBinary("/gone/ritual", exists(["/a"]), ["/a"]);
    expect(found).toBe("/a");
  });

  it("takes the first candidate that exists, in order", () => {
    const found = discoverBinary(undefined, exists(["/b", "/c"]), [
      "/a",
      "/b",
      "/c",
    ]);
    expect(found).toBe("/b");
  });

  it("returns undefined when nothing is installed", () => {
    expect(discoverBinary(undefined, exists([]), ["/a"])).toBeUndefined();
  });

  it("ignores a blank override rather than treating it as a path", () => {
    expect(discoverBinary("   ", exists(["/a"]), ["/a"])).toBe("/a");
  });
});

describe("makeCli", () => {
  it("parses JSON from stdout", async () => {
    const run = vi
      .fn()
      .mockResolvedValue({ stdout: '{"changed":true}', stderr: "" });
    const cli = makeCli("/bin/ritual", run);

    await expect(
      cli.json<{ changed: boolean }>(["complete", "x"]),
    ).resolves.toEqual({
      changed: true,
    });
    expect(run).toHaveBeenCalledWith("/bin/ritual", [
      "complete",
      "x",
      "--json",
    ]);
  });

  it("names the preference when the binary is missing", async () => {
    const err = Object.assign(new Error("spawn ENOENT"), { code: "ENOENT" });
    const cli = makeCli("/bin/ritual", vi.fn().mockRejectedValue(err));

    await expect(cli.run(["list"])).rejects.toMatchObject({ kind: "missing" });
  });

  it("prefers the CLI's own stderr message over node's wrapper", async () => {
    const err = Object.assign(new Error("Command failed"), {
      code: 3,
      stderr: "ritual: no task with id abc\n",
    });
    const cli = makeCli("/bin/ritual", vi.fn().mockRejectedValue(err));

    await expect(cli.run(["show", "abc"])).rejects.toThrow(
      "no task with id abc",
    );
  });

  it("rejects a list endpoint that did not return an array", async () => {
    const cli = makeCli(
      "/bin/ritual",
      vi.fn().mockResolvedValue({ stdout: "{}", stderr: "" }),
    );

    await expect(cli.list(["list"])).rejects.toBeInstanceOf(RitualCliError);
  });

  it("reports unreadable output with the command that produced it", async () => {
    const cli = makeCli(
      "/bin/ritual",
      vi.fn().mockResolvedValue({ stdout: "not json", stderr: "" }),
    );

    await expect(cli.json(["list", "--today"])).rejects.toThrow("list --today");
  });

  it("classifies a non-executable binary as denied", () => {
    const err = Object.assign(new Error("spawn EACCES"), { code: "EACCES" });
    const cli = makeCli("/bin/ritual", vi.fn().mockRejectedValue(err));

    return expect(cli.run(["list"])).rejects.toMatchObject({ kind: "denied" });
  });

  it("classifies an ordinary failure as failed, so only a real setup problem reads as missing", () => {
    const err = Object.assign(new Error("Command failed"), {
      code: 3,
      stderr: "ritual: no task with id abc\n",
    });
    const cli = makeCli("/bin/ritual", vi.fn().mockRejectedValue(err));

    return expect(cli.run(["show", "abc"])).rejects.toMatchObject({
      kind: "failed",
    });
  });
});

describe("pendingSyncNote", () => {
  it("extracts the CLI's unsynced-changes line", () => {
    const note = pendingSyncNote(
      "ritual: 3 changes waiting to sync — open Ritual, or pass --sync\n",
    );
    expect(note).toBe("3 changes waiting to sync");
  });

  it("returns undefined for unrelated stderr", () => {
    expect(pendingSyncNote("ritual: something else\n")).toBeUndefined();
  });

  it("returns undefined for empty stderr", () => {
    expect(pendingSyncNote("")).toBeUndefined();
  });
});
