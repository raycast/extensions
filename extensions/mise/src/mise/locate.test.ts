import { homedir } from "node:os";
import { describe, expect, it, vi } from "vitest";
import {
  BASE_PATH,
  ENV_TTL_MS,
  parseProbeOutput,
  PROBE_BACKOFF_MS,
  PROBE_LABEL,
  resolveMise,
  staticCandidates,
  type MiseStorage,
  type ProbeResult,
} from "./locate";

const LOCAL = `${homedir()}/.local/bin/mise`;
const HOMEBREW = "/opt/homebrew/bin/mise";
const HOME_BIN = `${homedir()}/bin`;
const PROBED: ProbeResult = {
  command: "mise",
  installPath: "",
  env: { HOME: homedir(), PATH: `${HOME_BIN}:/usr/bin:/bin`, CARGO_HOME: "/x/cargo" },
};
// The probed PATH with the base directories it lacks appended, then the fixed overlay.
const PROBED_ENV = {
  HOME: homedir(),
  CARGO_HOME: "/x/cargo",
  PATH: `${HOME_BIN}:/usr/bin:/bin:/opt/homebrew/bin:/usr/local/bin`,
  MISE_YES: "1",
  NO_COLOR: "1",
};
const BASE_ENV = { PATH: BASE_PATH, MISE_YES: "1", NO_COLOR: "1" };

function memoryStorage(initial: Record<string, string> = {}): MiseStorage & { data: Record<string, string> } {
  const data = { ...initial };
  return { data, get: (key) => data[key], set: (key, value) => void (data[key] = value) };
}

function existsAt(...paths: string[]) {
  return (path: string) => paths.includes(path);
}

describe("resolveMise", () => {
  it("checks the preference, then ~/.local/bin, /opt/homebrew/bin, /usr/local/bin in order", () => {
    expect(staticCandidates()).toEqual([LOCAL, HOMEBREW, "/usr/local/bin/mise"]);
  });

  it("prefers the misePath preference over every candidate and runs it in the login shell's env", async () => {
    const probe = vi.fn().mockResolvedValue({ ...PROBED, command: "/nix/bin/mise" });
    const result = await resolveMise({
      preferredPath: "/custom/mise",
      storage: memoryStorage(),
      exists: existsAt("/custom/mise", LOCAL, "/nix/bin/mise"),
      probe,
    });
    expect(result).toEqual({ path: "/custom/mise", env: PROBED_ENV });
  });

  it("treats a blank preference as unset", async () => {
    for (const preferredPath of ["", "  "]) {
      const probe = vi.fn().mockResolvedValue(PROBED);
      const result = await resolveMise({ preferredPath, storage: memoryStorage(), exists: existsAt(LOCAL), probe });
      expect(result).toEqual({ path: LOCAL, env: PROBED_ENV });
    }
  });

  it("reports only the preference as searched when it is set but does not exist", async () => {
    const probe = vi.fn();
    const result = await resolveMise({
      preferredPath: "/custom/mise",
      storage: memoryStorage(),
      exists: existsAt(HOMEBREW),
      probe,
    });
    expect(result).toEqual({ searched: ["/custom/mise"] });
    expect(probe).not.toHaveBeenCalled();
  });

  it("probes the login shell once for a static candidate and reuses the cached env", async () => {
    const storage = memoryStorage();
    const probe = vi.fn().mockResolvedValue(PROBED);
    const first = await resolveMise({ storage, exists: existsAt(LOCAL), probe });
    expect(first).toEqual({ path: LOCAL, env: PROBED_ENV });
    const second = await resolveMise({ storage, exists: existsAt(LOCAL), probe });
    expect(second).toEqual(first);
    expect(probe).toHaveBeenCalledTimes(1);
  });

  it("re-probes once the cached env is a day old", async () => {
    const storage = memoryStorage();
    const probe = vi.fn().mockResolvedValue(PROBED);
    let clock = 1_000_000;
    const now = () => clock;
    await resolveMise({ storage, exists: existsAt(LOCAL), probe, now });
    clock += ENV_TTL_MS - 1;
    await resolveMise({ storage, exists: existsAt(LOCAL), probe, now });
    expect(probe).toHaveBeenCalledTimes(1);
    clock += 1;
    probe.mockResolvedValue({ ...PROBED, env: { ...PROBED.env, CARGO_HOME: "/y/cargo" } });
    const result = await resolveMise({ storage, exists: existsAt(LOCAL), probe, now });
    expect(probe).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ env: { CARGO_HOME: "/y/cargo" } });
  });

  it("re-probes when the mise the cached PATH held has gone", async () => {
    const storage = memoryStorage();
    await resolveMise({ storage, exists: existsAt(`${HOME_BIN}/mise`), probe: vi.fn().mockResolvedValue(PROBED) });
    const probe = vi.fn().mockResolvedValue({ ...PROBED, env: { ...PROBED.env, PATH: "/new/bin" } });
    const result = await resolveMise({ storage, exists: existsAt("/new/bin/mise"), probe });
    expect(probe).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ path: "/new/bin/mise", env: { PATH: `/new/bin:${BASE_PATH}` } });
  });

  it("overlays MISE_YES and NO_COLOR over the user's values and appends the base PATH", async () => {
    const probe = vi.fn().mockResolvedValue({
      ...PROBED,
      env: { PATH: "/opt/homebrew/bin:/mine", MISE_YES: "0", NO_COLOR: "0", GOPATH: "/go" },
    });
    const result = await resolveMise({ storage: memoryStorage(), exists: existsAt(LOCAL), probe });
    expect(result).toEqual({
      path: LOCAL,
      env: {
        PATH: "/opt/homebrew/bin:/mine:/usr/local/bin:/usr/bin:/bin",
        MISE_YES: "1",
        NO_COLOR: "1",
        GOPATH: "/go",
      },
    });
  });

  it("falls back to the base PATH when the probe fails, then backs off for five minutes", async () => {
    const storage = memoryStorage();
    const probe = vi.fn().mockResolvedValue(undefined);
    let clock = 1_000_000;
    const now = () => clock;

    const failed = await resolveMise({ storage, exists: existsAt(LOCAL), probe, now });
    expect(failed).toEqual({ path: LOCAL, env: BASE_ENV });

    clock += PROBE_BACKOFF_MS - 1;
    await resolveMise({ storage, exists: existsAt(LOCAL), probe, now });
    expect(probe).toHaveBeenCalledTimes(1);

    clock += 1;
    probe.mockResolvedValue(PROBED);
    const recovered = await resolveMise({ storage, exists: existsAt(LOCAL), probe, now });
    expect(probe).toHaveBeenCalledTimes(2);
    expect(recovered).toEqual({ path: LOCAL, env: PROBED_ENV });
  });

  it("finds mise on the probed PATH when no candidate exists, and caches the hit", async () => {
    const storage = memoryStorage();
    const probe = vi.fn().mockResolvedValue(PROBED);
    const exists = existsAt(`${HOME_BIN}/mise`);
    const first = await resolveMise({ storage, exists, probe });
    expect(first).toEqual({ path: `${HOME_BIN}/mise`, env: PROBED_ENV });
    const second = await resolveMise({ storage, exists, probe });
    expect(second).toEqual(first);
    expect(probe).toHaveBeenCalledTimes(1);
  });

  it("uses an absolute command from the probe directly", async () => {
    const probe = vi.fn().mockResolvedValue({ ...PROBED, command: "/nix/bin/mise" });
    const result = await resolveMise({ storage: memoryStorage(), exists: existsAt("/nix/bin/mise"), probe });
    expect(result).toMatchObject({ path: "/nix/bin/mise" });
  });

  it("reports every path searched when the probe finds nothing, backs off, then probes again", async () => {
    const storage = memoryStorage();
    const probe = vi.fn().mockResolvedValue(PROBED);
    let clock = 1_000_000;
    const now = () => clock;
    const exists = () => false;

    const miss = await resolveMise({ storage, exists, probe, now });
    expect(miss).toEqual({ searched: [LOCAL, HOMEBREW, "/usr/local/bin/mise", PROBE_LABEL] });

    clock += PROBE_BACKOFF_MS - 1;
    expect(await resolveMise({ storage, exists, probe, now })).toEqual(miss);
    expect(probe).toHaveBeenCalledTimes(1);

    clock += 1;
    const found = await resolveMise({ storage, exists: existsAt(`${HOME_BIN}/mise`), probe, now });
    expect(probe).toHaveBeenCalledTimes(2);
    expect(found).toMatchObject({ path: `${HOME_BIN}/mise` });
  });

  it("treats a probe that returns nothing as a miss", async () => {
    const result = await resolveMise({ storage: memoryStorage(), exists: () => false, probe: async () => undefined });
    expect(result).toMatchObject({ searched: expect.arrayContaining([PROBE_LABEL]) });
  });

  it("ignores a cached record it cannot read", async () => {
    const probe = vi.fn().mockResolvedValue(PROBED);
    for (const raw of ["not json", JSON.stringify({ env: { PATH: 1 } })]) {
      const storage = memoryStorage({ "locate.env": raw });
      expect(await resolveMise({ storage, exists: existsAt(LOCAL), probe })).toEqual({ path: LOCAL, env: PROBED_ENV });
    }
    expect(probe).toHaveBeenCalledTimes(2);
  });
});

describe("parseProbeOutput", () => {
  it("reads NUL-separated pairs and the sentinel, dropping shell state and unnameable keys", () => {
    const stdout = [
      "banner from .zshrc",
      "HOME=/Users/x",
      "PATH=/a:/b",
      "FZF_OPTS=--bind=ctrl-d:down\n--multi",
      "SHLVL=1",
      "PWD=/Users/x",
      "OLDPWD=/",
      "TERM_SESSION_ID=abc",
      "_=/usr/bin/env",
      "BASH_FUNC_x%%=() { :; }",
      "=nokey",
      "",
      "<<mise||/Users/x/.local/bin/mise>>",
    ].join("\0");
    expect(parseProbeOutput(stdout)).toEqual({
      env: { HOME: "/Users/x", PATH: "/a:/b", FZF_OPTS: "--bind=ctrl-d:down\n--multi" },
      command: "mise",
      installPath: "/Users/x/.local/bin/mise",
    });
  });

  it("returns nothing when the sentinel never arrived", () => {
    expect(parseProbeOutput("HOME=/Users/x\0PATH=/a\0")).toBeUndefined();
    expect(parseProbeOutput("zsh: command not found")).toBeUndefined();
  });
});
