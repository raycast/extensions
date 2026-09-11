import { describe, test } from "node:test";
import { expect } from "./expect";
import {
  resolveAndroidCliPath,
  loginShellLookupCommand,
  installerUrlForArch,
  installCommandForArch,
  expandHome,
  ResolveDeps,
} from "./androidCliResolver";
import { CommandRunner } from "./commandRunner";

const HOME = "/Users/dev";

function fakeRunner(shellResult: string | Error): CommandRunner {
  return {
    exec: async () => {
      if (shellResult instanceof Error) throw shellResult;
      return shellResult;
    },
    spawn: () => undefined,
  };
}

function deps(overrides: Partial<ResolveDeps>): ResolveDeps {
  return {
    preferencePath: "",
    runner: fakeRunner(new Error("not found")),
    fileExists: () => false,
    homeDir: HOME,
    ...overrides,
  };
}

describe("expandHome", () => {
  test("Given a ~/ path, When expanding, Then the leading ~ becomes the home dir", () => {
    expect(expandHome("~/.local/bin/android", HOME)).toBe(
      `${HOME}/.local/bin/android`
    );
  });
  test("Given a bare ~, When expanding, Then it is the home dir", () => {
    expect(expandHome("~", HOME)).toBe(HOME);
  });
  test("Given an absolute path, When expanding, Then it is unchanged", () => {
    expect(expandHome("/usr/local/bin/android", HOME)).toBe(
      "/usr/local/bin/android"
    );
  });
});

describe("resolveAndroidCliPath with a home-relative preference", () => {
  test("Given a ~ androidCliPath that exists on disk, When resolving, Then the expanded path wins (no install prompt)", async () => {
    const expanded = `${HOME}/.local/bin/android`;
    const result = await resolveAndroidCliPath(
      deps({
        preferencePath: "~/.local/bin/android",
        fileExists: (p) => p === expanded,
      })
    );
    expect(result).toBe(expanded);
  });
});

describe("resolveAndroidCliPath", () => {
  test("Given a configured preference path that exists, When resolving, Then it wins and the shell is never consulted", async () => {
    let shellConsulted = false;
    const runner: CommandRunner = {
      exec: async () => {
        shellConsulted = true;
        return "/somewhere/android";
      },
      spawn: () => undefined,
    };

    const result = await resolveAndroidCliPath(
      deps({
        preferencePath: "/custom/bin/android",
        fileExists: (p) => p === "/custom/bin/android",
        runner,
      })
    );

    expect(result).toBe("/custom/bin/android");
    expect(shellConsulted).toBe(false);
  });

  test("Given no preference, When the login shell finds the binary, Then it wins over known locations", async () => {
    const result = await resolveAndroidCliPath(
      deps({
        runner: fakeRunner("/Users/dev/.local/bin/android\n"),
        // both the shell hit and a known location "exist"
        fileExists: () => true,
      })
    );

    expect(result).toBe("/Users/dev/.local/bin/android");
  });

  test("Given an interactive login shell prints rc noise before the path, When resolving, Then the real on-disk path is returned, not the noise", async () => {
    // Real captured `zsh -ilc` output: a setopt warning line precedes the path,
    // which itself trails iTerm shell-integration escape sequences.
    const noisyOutput =
      "(anon):setopt:7: can't change option: monitor\n" +
      "[ERROR]: gitstatus failed to initialize.\n" +
      "/Users/dev/.local/bin/android\n";

    const result = await resolveAndroidCliPath(
      deps({
        runner: fakeRunner(noisyOutput),
        fileExists: (p) => p === "/Users/dev/.local/bin/android",
      })
    );

    expect(result).toBe("/Users/dev/.local/bin/android");
  });

  test("Given the login shell emits pure rc noise with no valid path, When resolving, Then it falls through to a known location", async () => {
    const result = await resolveAndroidCliPath(
      deps({
        runner: fakeRunner("p10k instant prompt banner\njust noise\n"),
        fileExists: (p) => p === "/usr/local/bin/android",
      })
    );

    expect(result).toBe("/usr/local/bin/android");
  });

  test("Given the login shell returns a path that is not on disk, When resolving, Then the stale path is ignored and a known location is used", async () => {
    const result = await resolveAndroidCliPath(
      deps({
        runner: fakeRunner("/stale/uninstalled/android\n"),
        fileExists: (p) => p === `${HOME}/.local/bin/android`,
      })
    );

    expect(result).toBe(`${HOME}/.local/bin/android`);
  });

  test("Given no preference and an empty shell PATH, When a known location exists, Then it is used", async () => {
    const result = await resolveAndroidCliPath(
      deps({
        runner: fakeRunner(new Error("command -v exited 1")),
        fileExists: (p) => p === "/usr/local/bin/android",
      })
    );

    expect(result).toBe("/usr/local/bin/android");
  });

  test("Given a home-relative known location exists, When resolving, Then the expanded path is returned", async () => {
    const result = await resolveAndroidCliPath(
      deps({ fileExists: (p) => p === `${HOME}/.local/bin/android` })
    );

    expect(result).toBe(`${HOME}/.local/bin/android`);
  });

  test("Given nothing is installed anywhere, When resolving, Then it returns undefined", async () => {
    const result = await resolveAndroidCliPath(deps({}));
    expect(result).toBeUndefined();
  });
});

describe("loginShellLookupCommand", () => {
  test("Given a shell, When building the lookup command, Then it uses a NON-interactive login shell to avoid rc prompt noise", () => {
    // `-i` (interactive) triggers prompt frameworks (p10k/gitstatus/iTerm
    // integration) that pollute stdout; `-lc` still sources login profiles.
    expect(loginShellLookupCommand("/bin/zsh")).toBe(
      "/bin/zsh -lc 'command -v android'"
    );
  });
});

describe("installerUrlForArch", () => {
  test("Given arm64, When selecting the installer, Then the darwin_arm64 script is chosen", () => {
    expect(installerUrlForArch("arm64")).toBe(
      "https://dl.google.com/android/cli/latest/darwin_arm64/install.sh"
    );
  });

  test("Given x64, When selecting the installer, Then the darwin_x86_64 script is chosen", () => {
    expect(installerUrlForArch("x64")).toBe(
      "https://dl.google.com/android/cli/latest/darwin_x86_64/install.sh"
    );
  });
});

describe("installCommandForArch", () => {
  test("Given an arch, When building the copyable command, Then it pipes the per-arch script to bash", () => {
    expect(installCommandForArch("arm64")).toBe(
      "curl -fsSL https://dl.google.com/android/cli/latest/darwin_arm64/install.sh | bash"
    );
  });
});
