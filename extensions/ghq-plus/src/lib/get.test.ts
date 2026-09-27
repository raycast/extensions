import { describe, expect, it } from "vitest";
import {
  buildExactListArgs,
  buildGetArgs,
  buildGetEnv,
  diffNewPaths,
  getRepository,
  GhqCancelledError,
  GhqError,
  keepEnd,
  matchPathsIgnoringCase,
  stripAnsi,
  summarizeGhqError,
  type GhqGetExecutor,
} from "./get";
import type { GhqExecutor } from "./ghq";

const ESC = String.fromCharCode(27);

describe("buildGetArgs", () => {
  it("builds `ghq get -- <repository>`", () => {
    expect(buildGetArgs({ repository: "windhorn/ghq", ssh: false })).toEqual(["get", "--", "windhorn/ghq"]);
  });

  it("adds -p before the terminator when ssh is enabled", () => {
    expect(buildGetArgs({ repository: "windhorn/ghq", ssh: true })).toEqual(["get", "-p", "--", "windhorn/ghq"]);
  });

  it("keeps the -- terminator in front of input that starts with a dash", () => {
    expect(buildGetArgs({ repository: "-bogus", ssh: false })).toEqual(["get", "--", "-bogus"]);
    expect(buildGetArgs({ repository: "--update", ssh: true })).toEqual(["get", "-p", "--", "--update"]);
  });

  it("passes every input form through unchanged", () => {
    expect(buildGetArgs({ repository: "https://github.com/windhorn/ghq", ssh: false })).toEqual([
      "get",
      "--",
      "https://github.com/windhorn/ghq",
    ]);
    expect(buildGetArgs({ repository: "git@github.com:windhorn/ghq.git", ssh: false })).toEqual([
      "get",
      "--",
      "git@github.com:windhorn/ghq.git",
    ]);
    expect(buildGetArgs({ repository: "ghq", ssh: false })).toEqual(["get", "--", "ghq"]);
  });
});

describe("buildExactListArgs", () => {
  it("builds `ghq list --full-path --exact -- <repository>`", () => {
    expect(buildExactListArgs("windhorn/ghq")).toEqual(["list", "--full-path", "--exact", "--", "windhorn/ghq"]);
  });

  it("keeps the -- terminator in front of input that starts with a dash", () => {
    expect(buildExactListArgs("-bogus")).toEqual(["list", "--full-path", "--exact", "--", "-bogus"]);
  });

  it("passes every input form through unchanged", () => {
    expect(buildExactListArgs("https://github.com/windhorn/ghq")).toEqual([
      "list",
      "--full-path",
      "--exact",
      "--",
      "https://github.com/windhorn/ghq",
    ]);
    expect(buildExactListArgs("git@github.com:windhorn/ghq.git")).toEqual([
      "list",
      "--full-path",
      "--exact",
      "--",
      "git@github.com:windhorn/ghq.git",
    ]);
    expect(buildExactListArgs("ghq")).toEqual(["list", "--full-path", "--exact", "--", "ghq"]);
  });
});

describe("diffNewPaths", () => {
  it("returns the entries of after that are not in before", () => {
    const before = ["/Users/dai/dev/github.com/x-motemen/ghq"];
    const after = ["/Users/dai/dev/github.com/x-motemen/ghq", "/Users/dai/dev/github.com/windhorn/ghq"];
    expect(diffNewPaths(before, after)).toEqual(["/Users/dai/dev/github.com/windhorn/ghq"]);
  });

  it("preserves the order of after", () => {
    expect(diffNewPaths(["/dev/m/m"], ["/dev/z/z", "/dev/m/m", "/dev/a/a"])).toEqual(["/dev/z/z", "/dev/a/a"]);
  });

  it("drops duplicates", () => {
    expect(diffNewPaths(["/dev/m/m"], ["/dev/z/z", "/dev/a/a", "/dev/z/z", "/dev/m/m"])).toEqual([
      "/dev/z/z",
      "/dev/a/a",
    ]);
  });

  it("returns every entry of after when before is empty", () => {
    expect(diffNewPaths([], ["/dev/a/a", "/dev/b/b"])).toEqual(["/dev/a/a", "/dev/b/b"]);
  });

  it("returns an empty array when nothing is new", () => {
    expect(diffNewPaths(["/dev/a/a", "/dev/b/b"], ["/dev/b/b", "/dev/a/a"])).toEqual([]);
    expect(diffNewPaths(["/dev/a/a", "/dev/b/b"], ["/dev/a/a"])).toEqual([]);
    expect(diffNewPaths(["/dev/a/a"], [])).toEqual([]);
    expect(diffNewPaths([], [])).toEqual([]);
  });
});

describe("matchPathsIgnoringCase", () => {
  const paths = [
    "/Users/dai/dev/github.com/windhorn/ghq",
    "/Users/dai/dev/github.com/x-motemen/ghq",
    "/Users/dai/dev/github.com/windhorn/ghq-extra",
  ];

  it("matches an https URL whose owner and repository differ only in case", () => {
    expect(matchPathsIgnoringCase(paths, "https://github.com/Windhorn/GHQ")).toEqual([paths[0]]);
  });

  it("matches a path whose own case differs from lower-case input", () => {
    const mixed = ["/Users/dai/dev/github.com/Microsoft/TypeScript"];
    expect(matchPathsIgnoringCase(mixed, "https://github.com/microsoft/typescript")).toEqual(mixed);
  });

  it("matches the scp-like SSH form, ignoring the user, the host case and the .git suffix", () => {
    expect(matchPathsIgnoringCase(paths, "git@GitHub.com:windhorn/ghq.git")).toEqual([paths[0]]);
    expect(matchPathsIgnoringCase(paths, "github.com:Windhorn/ghq")).toEqual([paths[0]]);
  });

  it("ignores the user, the port, the query, the fragment, the .git suffix and a trailing slash of a URL", () => {
    expect(matchPathsIgnoringCase(paths, "ssh://git@github.com:22/windhorn/ghq.git/")).toEqual([paths[0]]);
    expect(matchPathsIgnoringCase(paths, "https://github.com/windhorn/GHQ?tab=readme#usage")).toEqual([paths[0]]);
  });

  it("matches owner/repo and a bare name on a path boundary only", () => {
    expect(matchPathsIgnoringCase(paths, "Windhorn/GHQ")).toEqual([paths[0]]);
    expect(matchPathsIgnoringCase(paths, "windhorn/ghq.git")).toEqual([paths[0]]);
    expect(matchPathsIgnoringCase(paths, "GHQ")).toEqual([paths[0], paths[1]]);
    expect(matchPathsIgnoringCase(paths, "hq")).toEqual([]);
    expect(matchPathsIgnoringCase(paths, "horn/ghq")).toEqual([]);
  });

  it("does not match another host, owner or repository", () => {
    expect(matchPathsIgnoringCase(paths, "https://gitlab.com/windhorn/ghq")).toEqual([]);
    expect(matchPathsIgnoringCase(paths, "https://github.com/octocat/ghq")).toEqual([]);
    expect(matchPathsIgnoringCase(paths, "https://github.com/windhorn/gh")).toEqual([]);
  });

  it("returns nothing for input without a path", () => {
    expect(matchPathsIgnoringCase(paths, "")).toEqual([]);
    expect(matchPathsIgnoringCase(paths, "/")).toEqual([]);
    expect(matchPathsIgnoringCase(paths, "https://")).toEqual([]);
    expect(matchPathsIgnoringCase(paths, ".git")).toEqual([]);
  });
});

describe("stripAnsi", () => {
  it("removes the colour codes ghq puts around its log labels", () => {
    expect(stripAnsi(`${ESC}[0;33m    exists${ESC}[0m /Users/dai/dev/github.com/octocat/Hello-World`)).toBe(
      "    exists /Users/dai/dev/github.com/octocat/Hello-World",
    );
  });

  it("removes sequences with one parameter, several parameters or none", () => {
    expect(stripAnsi(`${ESC}[1mbold${ESC}[0m ${ESC}[1;4;31mred${ESC}[m done${ESC}[K`)).toBe("bold red done");
  });

  it("removes every sequence and keeps the line breaks", () => {
    const stderr = `${ESC}[0;32m     clone${ESC}[0m a -> b\r\n${ESC}[0;31m     error${ESC}[0m failed\n`;
    expect(stripAnsi(stderr)).toBe("     clone a -> b\r\n     error failed\n");
  });

  it("returns an empty string when only escape sequences are left", () => {
    expect(stripAnsi(`${ESC}[0m`)).toBe("");
  });

  it("returns text without escape sequences unchanged", () => {
    expect(stripAnsi("")).toBe("");
    expect(stripAnsi("fatal: early EOF\n")).toBe("fatal: early EOF\n");
  });

  it("leaves bracketed text that does not follow an ESC character alone", () => {
    expect(stripAnsi("[0;31m     error[0m failed")).toBe("[0;31m     error[0m failed");
  });
});

describe("summarizeGhqError", () => {
  it("returns git's fatal message when the repository is not found", () => {
    const stderr = [
      `${ESC}[0;32m     clone${ESC}[0m https://github.com/octocat/nope -> /Users/dai/dev/github.com/octocat/nope`,
      `${ESC}[0;37m       git${ESC}[0m clone --recursive https://github.com/octocat/nope /Users/dai/dev/github.com/octocat/nope`,
      "Cloning into '/Users/dai/dev/github.com/octocat/nope'...",
      "remote: Repository not found.",
      "fatal: repository 'https://github.com/octocat/nope/' not found",
      `${ESC}[0;31m     error${ESC}[0m failed to get "https://github.com/octocat/nope": /usr/bin/git: exit status 128`,
      "",
    ].join("\n");
    expect(summarizeGhqError(stderr)).toBe("repository 'https://github.com/octocat/nope/' not found");
  });

  it("returns git's fatal message when credentials are needed and prompts are disabled", () => {
    const stderr = [
      "Cloning into '/Users/dai/dev/github.com/octocat/private'...",
      "/opt/homebrew/bin/gh auth git-credential get: /opt/homebrew/bin/gh: No such file or directory",
      "fatal: could not read Username for 'https://github.com': terminal prompts disabled",
      `${ESC}[0;31m     error${ESC}[0m failed to get "https://github.com/octocat/private": /usr/bin/git: exit status 128`,
      "",
    ].join("\n");
    expect(summarizeGhqError(stderr)).toBe(
      "could not read Username for 'https://github.com': terminal prompts disabled",
    );
  });

  it("returns ghq's own error message for a usage error followed by the help text", () => {
    const stderr = [
      "Incorrect Usage: flag provided but not defined: -bogus",
      "",
      "NAME:",
      "   ghq get - Clone/sync with a remote repository",
      "",
      "OPTIONS:",
      "   --update, -u   Update local repository if cloned already (default: false)",
      `${ESC}[0;31m     error${ESC}[0m flag provided but not defined: -bogus`,
      "",
    ].join("\n");
    expect(summarizeGhqError(stderr)).toBe("flag provided but not defined: -bogus");
  });

  it("treats the bare CR of git progress output as a line break", () => {
    expect(summarizeGhqError("Receiving objects:  10%\rReceiving objects:  50%\rfatal: early EOF\n")).toBe("early EOF");
    expect(summarizeGhqError("Receiving objects:  10%\rReceiving objects:  50%\r")).toBe("Receiving objects:  50%");
  });

  it("handles CRLF line endings", () => {
    expect(summarizeGhqError("Cloning into 'x'...\r\nfatal: early EOF\r\n")).toBe("early EOF");
    expect(summarizeGhqError("first line\r\nlast line\r\n")).toBe("last line");
  });

  it("uses the first fatal line when there are several", () => {
    expect(summarizeGhqError("fatal: the remote end hung up unexpectedly\nfatal: early EOF\n")).toBe(
      "the remote end hung up unexpectedly",
    );
  });

  it("prefers a fatal line over an error line that comes before it", () => {
    expect(summarizeGhqError(`${ESC}[0;31m     error${ESC}[0m failed to get\nfatal: early EOF\n`)).toBe("early EOF");
  });

  it("trims the line and the text after fatal:", () => {
    expect(summarizeGhqError("   fatal:    early EOF   \n")).toBe("early EOF");
  });

  it("ignores fatal: when it is not at the start of the line", () => {
    expect(summarizeGhqError("remote: fatal: not for us\nlast line\n")).toBe("last line");
  });

  it("uses the last error line when there are several, even when other lines follow", () => {
    const stderr = [
      `${ESC}[0;31m     error${ESC}[0m first failure`,
      "something in between",
      `${ESC}[0;31m     error${ESC}[0m second failure`,
      "trailing note",
      "",
    ].join("\n");
    expect(summarizeGhqError(stderr)).toBe("second failure");
  });

  it("matches an error line without colour codes", () => {
    expect(summarizeGhqError("     error failed to get\ntrailing note\n")).toBe("failed to get");
  });

  it("requires whitespace right after a leading error", () => {
    expect(summarizeGhqError("an error occurred\nerrors were found\nlast line\n")).toBe("last line");
  });

  it("falls back to the last non-empty line", () => {
    expect(summarizeGhqError("Cloning into 'x'...\n  something went wrong  \n\n")).toBe("something went wrong");
  });

  it("prefers the line before git's generic SSH fatal message when the repository is not found", () => {
    const stderr = [
      `${ESC}[0;32m     clone${ESC}[0m ssh://git@github.com/octocat/nope -> /Users/dai/dev/github.com/octocat/nope`,
      `${ESC}[0;37m       git${ESC}[0m clone --recursive ssh://git@github.com/octocat/nope /Users/dai/dev/github.com/octocat/nope`,
      "Cloning into '/Users/dai/dev/github.com/octocat/nope'...",
      "ERROR: Repository not found.",
      "fatal: Could not read from remote repository.",
      "",
      "Please make sure you have the correct access rights",
      "and the repository exists.",
      `${ESC}[0;31m     error${ESC}[0m failed to get "octocat/nope": /usr/bin/git: exit status 128`,
      "",
    ].join("\n");
    expect(summarizeGhqError(stderr)).toBe("Repository not found.");
  });

  it("prefers the line before git's generic SSH fatal message when the key is rejected", () => {
    const stderr = [
      "Cloning into '/Users/dai/dev/github.com/octocat/private'...",
      "git@github.com: Permission denied (publickey).",
      "fatal: Could not read from remote repository.",
      "",
      "Please make sure you have the correct access rights",
      "and the repository exists.",
    ].join("\n");
    expect(summarizeGhqError(stderr)).toBe("git@github.com: Permission denied (publickey).");
  });

  it("prefers the line before git's generic SSH fatal message when the host key is unknown", () => {
    const stderr = "Host key verification failed.\nfatal: Could not read from remote repository.\n";
    expect(summarizeGhqError(stderr)).toBe("Host key verification failed.");
  });

  it("unwraps the framed message GitLab sends before git's generic SSH fatal message", () => {
    const frame = "remote: ========================================================================";
    const stderr = [
      "Cloning into '/Users/dai/dev/gitlab.com/group/nope'...",
      "remote: ",
      frame,
      "remote: ",
      "remote: The project you were looking for could not be found or you don't have permission to view it.",
      "remote: ",
      frame,
      "remote: ",
      "fatal: Could not read from remote repository.",
    ].join("\n");
    expect(summarizeGhqError(stderr)).toBe(
      "The project you were looking for could not be found or you don't have permission to view it.",
    );
  });

  it("uses the first line of a multi-line ERROR before git's generic SSH fatal message", () => {
    const stderr = [
      "Cloning into '/Users/dai/dev/github.com/acme/private'...",
      "ERROR: The `acme' organization has enabled or enforced SAML SSO. To access",
      "this repository, you must use the HTTPS remote with a personal access token",
      "or SSH with an SSH key and passphrase that has been authorized for this organization.",
      "Visit https://docs.github.com/articles/authenticating-to-a-github-organization-with-saml-single-sign-on/ for more information.",
      "",
      "fatal: Could not read from remote repository.",
    ].join("\n");
    expect(summarizeGhqError(stderr)).toBe("The `acme' organization has enabled or enforced SAML SSO. To access");
  });

  it("does not mistake an OpenSSH notice for the cause of git's generic SSH fatal message", () => {
    const cloning = "Cloning into '/Users/dai/dev/github.com/octocat/nope'...";
    const knownHosts = "Warning: Permanently added 'github.com' (ED25519) to the list of known hosts.";
    const postQuantum = [
      "** WARNING: connection is not using a post-quantum key exchange algorithm.",
      '** This session may be vulnerable to "store now, decrypt later" attacks.',
      "** The server may need to be upgraded. See https://openssh.com/pq.html",
    ].join("\n");
    const fatal = "fatal: Could not read from remote repository.";

    expect(summarizeGhqError([cloning, knownHosts, fatal].join("\n"))).toBe("Could not read from remote repository.");
    expect(summarizeGhqError([cloning, postQuantum, fatal].join("\n"))).toBe("Could not read from remote repository.");
    expect(summarizeGhqError([cloning, knownHosts, "ERROR: Repository not found.", fatal].join("\n"))).toBe(
      "Repository not found.",
    );
    expect(
      summarizeGhqError([cloning, postQuantum, "git@github.com: Permission denied (publickey).", fatal].join("\n")),
    ).toBe("git@github.com: Permission denied (publickey).");
  });

  it("names the submodule when it is a submodule that cannot be read over SSH", () => {
    const stderr = [
      "Cloning into '/Users/dai/dev/github.com/octocat/main'...",
      "Submodule 'vendor/x' (git@github.com:octocat/private.git) registered for path 'vendor/x'",
      "Cloning into '/Users/dai/dev/github.com/octocat/main/vendor/x'...",
      "ERROR: Repository not found.",
      "fatal: Could not read from remote repository.",
      "",
      "Please make sure you have the correct access rights",
      "and the repository exists.",
      "fatal: clone of 'git@github.com:octocat/private.git' into submodule path '/Users/dai/dev/github.com/octocat/main/vendor/x' failed",
      "Failed to clone 'vendor/x'. Retry scheduled",
    ].join("\n");
    expect(summarizeGhqError(stderr)).toBe("Repository not found. (submodule git@github.com:octocat/private.git)");
  });

  it("keeps git's generic SSH fatal message when nothing informative comes before it", () => {
    const cloning = "Cloning into '/Users/dai/dev/github.com/octocat/nope'...";
    expect(summarizeGhqError(`${cloning}\nfatal: Could not read from remote repository.\n`)).toBe(
      "Could not read from remote repository.",
    );
    expect(summarizeGhqError("fatal: Could not read from remote repository.\n")).toBe(
      "Could not read from remote repository.",
    );
  });

  it('returns "Unknown error" when there are no lines at all', () => {
    expect(summarizeGhqError("")).toBe("Unknown error");
    expect(summarizeGhqError("  \n\r\n\r  ")).toBe("Unknown error");
    expect(summarizeGhqError(`${ESC}[0m\n`)).toBe("Unknown error");
  });
});

describe("buildGetEnv", () => {
  const binary = "/Users/dai/.nix-profile/bin/ghq";

  it("disables git's terminal prompts and keeps the other variables", () => {
    const env = buildGetEnv({ PATH: "/usr/bin:/bin", HOME: "/Users/dai" }, binary);
    expect(env.GIT_TERMINAL_PROMPT).toBe("0");
    expect(env.HOME).toBe("/Users/dai");
  });

  it("appends the directory of the ghq binary and the usual package manager directories to PATH", () => {
    const env = buildGetEnv({ PATH: "/usr/bin:/bin" }, binary);
    expect(env.PATH).toBe("/usr/bin:/bin:/Users/dai/.nix-profile/bin:/opt/homebrew/bin:/usr/local/bin");
  });

  it("never puts a directory in front of the existing ones, so the git that is already found keeps winning", () => {
    const env = buildGetEnv({ PATH: "/usr/bin:/bin:/usr/sbin:/sbin" }, "/opt/homebrew/bin/ghq");
    expect(env.PATH).toBe("/usr/bin:/bin:/usr/sbin:/sbin:/opt/homebrew/bin:/usr/local/bin");
  });

  it("does not repeat directories that are already on PATH", () => {
    const env = buildGetEnv({ PATH: "/opt/homebrew/bin:/usr/bin:/usr/local/bin" }, "/opt/homebrew/bin/ghq");
    expect(env.PATH).toBe("/opt/homebrew/bin:/usr/bin:/usr/local/bin");
  });

  it("falls back to the system directories when PATH is missing or empty", () => {
    const expected = "/usr/bin:/bin:/usr/sbin:/sbin:/opt/homebrew/bin:/usr/local/bin";
    expect(buildGetEnv({}, "/opt/homebrew/bin/ghq").PATH).toBe(expected);
    expect(buildGetEnv({ PATH: "" }, "/opt/homebrew/bin/ghq").PATH).toBe(expected);
  });

  it("does not modify the environment it is given", () => {
    const original = { PATH: "/usr/bin" };
    buildGetEnv(original, binary);
    expect(original).toEqual({ PATH: "/usr/bin" });
  });

  it("does not add the directory of a binary that is not given as an absolute path", () => {
    // `.` or `bin` on PATH would resolve against whatever the working directory happens to be.
    expect(buildGetEnv({ PATH: "/usr/bin" }, "ghq").PATH).toBe("/usr/bin:/opt/homebrew/bin:/usr/local/bin");
    expect(buildGetEnv({ PATH: "/usr/bin" }, "bin/ghq").PATH).toBe("/usr/bin:/opt/homebrew/bin:/usr/local/bin");
  });
});

describe("keepEnd", () => {
  it("returns text that fits unchanged", () => {
    expect(keepEnd("abc", 10)).toBe("abc");
    expect(keepEnd("abc", 3)).toBe("abc");
    expect(keepEnd("", 3)).toBe("");
  });

  it("keeps only the end of text that exceeds the limit", () => {
    expect(keepEnd("abcdefghij", 5)).toBe("fghij");
    expect(keepEnd("abcd", 3)).toBe("bcd");
  });

  it("never starts with half of a surrogate pair", () => {
    const emoji = String.fromCodePoint(0x1f600);
    // The last 4 code units would start in the middle of the first emoji: its orphaned low surrogate is dropped too.
    expect(keepEnd(`x${emoji}${emoji}y`, 4)).toBe(`${emoji}y`);
    expect(keepEnd(`${emoji}${emoji}`, 3)).toBe(emoji);
  });
});

describe("GhqError", () => {
  it("is an Error named GhqError with the given message", () => {
    const error = new GhqError("early EOF", "fatal: early EOF\n");
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(GhqError);
    expect(error.name).toBe("GhqError");
    expect(error.message).toBe("early EOF");
  });

  it("keeps the raw stderr, colour codes included", () => {
    const stderr = `fatal: early EOF\n${ESC}[0;31m     error${ESC}[0m failed to get\n`;
    expect(new GhqError("early EOF", stderr).stderr).toBe(stderr);
  });
});

describe("GhqCancelledError", () => {
  it('is an Error named GhqCancelledError with the message "Cancelled"', () => {
    const error = new GhqCancelledError();
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(GhqCancelledError);
    expect(error.name).toBe("GhqCancelledError");
    expect(error.message).toBe("Cancelled");
  });

  it("is not a GhqError", () => {
    expect(new GhqCancelledError()).not.toBeInstanceOf(GhqError);
  });
});

describe("getRepository", () => {
  type Call = { kind: "list" | "get"; args: string[]; signal?: AbortSignal };

  // Fake executors that record every call. The exact lookup prints `before` until `ghq get` has finished, then `after`;
  // the unfiltered `ghq list --full-path` prints `all`.
  function createFakeExec(script: {
    before: string;
    after: string;
    all?: string;
    roots?: string;
    get?: GhqGetExecutor;
  }) {
    const calls: Call[] = [];
    let finished = false;
    const list: GhqExecutor = async (args) => {
      calls.push({ kind: "list", args });
      if (args[0] === "root") {
        return script.roots ?? "/Users/dai/dev\n";
      }
      if (args.length === 2 && args[1] === "--full-path") {
        return script.all ?? "";
      }
      return finished ? script.after : script.before;
    };
    const get: GhqGetExecutor = async (args, options) => {
      calls.push({ kind: "get", args, signal: options?.signal });
      await script.get?.(args, options);
      finished = true;
    };
    return { calls, exec: { list, get } };
  }

  it("looks the repository up, runs `ghq get` and reports the new path as cloned", async () => {
    const { calls, exec } = createFakeExec({ before: "", after: "/Users/dai/dev/github.com/windhorn/ghq\n" });

    const result = await getRepository(exec, { repository: "windhorn/ghq", ssh: false });

    expect(result).toEqual({
      status: "cloned",
      repositories: [
        {
          path: "/Users/dai/dev/github.com/windhorn/ghq",
          relativePath: "github.com/windhorn/ghq",
          name: "ghq",
          owner: "windhorn",
          host: "github.com",
        },
      ],
    });
    expect(calls.slice(0, 2)).toEqual([
      { kind: "list", args: ["list", "--full-path", "--exact", "--", "windhorn/ghq"] },
      { kind: "get", args: ["get", "--", "windhorn/ghq"] },
    ]);
    // The two lookups after the clone may run in either order.
    expect(calls.slice(2)).toHaveLength(2);
    expect(calls.slice(2)).toContainEqual({ kind: "list", args: ["root", "--all"] });
    expect(calls.slice(2)).toContainEqual({
      kind: "list",
      args: ["list", "--full-path", "--exact", "--", "windhorn/ghq"],
    });
  });

  it("runs `ghq get -p` when ssh is enabled", async () => {
    const { calls, exec } = createFakeExec({ before: "", after: "/Users/dai/dev/github.com/windhorn/ghq\n" });

    await getRepository(exec, { repository: "windhorn/ghq", ssh: true });

    expect(calls[1]).toEqual({ kind: "get", args: ["get", "-p", "--", "windhorn/ghq"] });
  });

  it("forwards the abort signal to the get executor", async () => {
    const { calls, exec } = createFakeExec({ before: "", after: "/Users/dai/dev/github.com/windhorn/ghq\n" });
    const controller = new AbortController();

    await getRepository(exec, { repository: "windhorn/ghq", ssh: false }, controller.signal);

    expect(calls[1].kind).toBe("get");
    expect(calls[1].signal).toBe(controller.signal);
  });

  it("reports exists when the repository was already there before `ghq get`", async () => {
    const { exec } = createFakeExec({
      before: "/Users/dai/dev/github.com/octocat/Hello-World\n",
      after: "/Users/dai/dev/github.com/octocat/Hello-World\n",
    });

    const result = await getRepository(exec, { repository: "https://github.com/octocat/Hello-World", ssh: false });

    expect(result).toEqual({
      status: "exists",
      repositories: [
        {
          path: "/Users/dai/dev/github.com/octocat/Hello-World",
          relativePath: "github.com/octocat/Hello-World",
          name: "Hello-World",
          owner: "octocat",
          host: "github.com",
        },
      ],
    });
  });

  it("reports only the new path when a bare name also matches a repository that already existed", async () => {
    const { exec } = createFakeExec({
      before: "/Users/dai/dev/github.com/x-motemen/ghq\n",
      after: "/Users/dai/dev/github.com/x-motemen/ghq\n/Users/dai/dev/github.com/windhorn/ghq\n",
    });

    const result = await getRepository(exec, { repository: "ghq", ssh: false });

    expect(result.status).toBe("cloned");
    expect(result.repositories.map((r) => r.relativePath)).toEqual(["github.com/windhorn/ghq"]);
    expect(result.repositories[0].path).toBe("/Users/dai/dev/github.com/windhorn/ghq");
  });

  it("reports every match as existing when a bare name matches several repositories and none is new", async () => {
    const { exec } = createFakeExec({
      before: "/Users/dai/dev/github.com/x-motemen/ghq\n/Users/dai/dev/github.com/windhorn/ghq\n",
      after: "/Users/dai/dev/github.com/x-motemen/ghq\n/Users/dai/dev/github.com/windhorn/ghq\n",
    });

    const result = await getRepository(exec, { repository: "ghq", ssh: false });

    expect(result.status).toBe("exists");
    expect(result.repositories.map((r) => r.relativePath)).toEqual([
      "github.com/x-motemen/ghq",
      "github.com/windhorn/ghq",
    ]);
  });

  it("falls back to a case-insensitive match when the exact lookup after `ghq get` finds nothing", async () => {
    const { calls, exec } = createFakeExec({
      before: "",
      after: "",
      all: "/Users/dai/dev/github.com/x-motemen/ghq\n/Users/dai/dev/github.com/windhorn/ghq\n",
    });

    const result = await getRepository(exec, { repository: "https://github.com/Windhorn/GHQ", ssh: false });

    // Whether `ghq get` cloned it or found it on a case-insensitive file system cannot be told here.
    expect(result).toEqual({
      status: "unknown",
      repositories: [
        {
          path: "/Users/dai/dev/github.com/windhorn/ghq",
          relativePath: "github.com/windhorn/ghq",
          name: "ghq",
          owner: "windhorn",
          host: "github.com",
        },
      ],
    });
    expect(calls).toHaveLength(5);
    expect(calls[4]).toEqual({ kind: "list", args: ["list", "--full-path"] });
  });

  it("reports unknown without repositories when no lookup after a successful `ghq get` finds anything", async () => {
    const { exec } = createFakeExec({ before: "", after: "", all: "/Users/dai/dev/github.com/x-motemen/ghq\n" });

    const result = await getRepository(exec, { repository: "windhorn/ghq", ssh: false });

    expect(result).toEqual({ status: "unknown", repositories: [] });
  });

  it("resolves the paths against every ghq root", async () => {
    const { exec } = createFakeExec({
      roots: "/Users/dai/dev\n/Users/dai/work\n",
      before: "",
      after: "/Users/dai/work/github.com/windhorn/ghq\n",
    });

    const result = await getRepository(exec, { repository: "windhorn/ghq", ssh: false });

    expect(result.repositories.map((r) => r.relativePath)).toEqual(["github.com/windhorn/ghq"]);
  });

  it("propagates an error from the first lookup unchanged and never runs `ghq get`", async () => {
    const error = new Error("ghq exploded");
    const calls: string[] = [];
    const exec = {
      list: async () => {
        calls.push("list");
        throw error;
      },
      get: async () => {
        calls.push("get");
      },
    };

    await expect(getRepository(exec, { repository: "windhorn/ghq", ssh: false })).rejects.toBe(error);
    expect(calls).toEqual(["list"]);
  });

  it("propagates a GhqError from `ghq get` unchanged and skips the lookups after it", async () => {
    const error = new GhqError("early EOF", "fatal: early EOF\n");
    const { calls, exec } = createFakeExec({
      before: "",
      after: "",
      get: async () => {
        throw error;
      },
    });

    await expect(getRepository(exec, { repository: "windhorn/ghq", ssh: false })).rejects.toBe(error);
    expect(calls.map((call) => call.kind)).toEqual(["list", "get"]);
  });

  it("propagates a GhqCancelledError from `ghq get` unchanged", async () => {
    const error = new GhqCancelledError();
    const { calls, exec } = createFakeExec({
      before: "",
      after: "",
      get: async () => {
        throw error;
      },
    });

    await expect(getRepository(exec, { repository: "windhorn/ghq", ssh: false })).rejects.toBe(error);
    expect(calls.map((call) => call.kind)).toEqual(["list", "get"]);
  });

  // Once `ghq get` has succeeded the repository is there: a lookup that fails afterwards must not turn that into a failure.
  it("reports unknown without repositories when `ghq root --all` fails after a successful `ghq get`", async () => {
    const exec = {
      list: async (args: string[]) => {
        if (args[0] === "root") {
          throw new Error("ghq exploded");
        }
        return "";
      },
      get: async () => {},
    };

    const result = await getRepository(exec, { repository: "windhorn/ghq", ssh: false });

    expect(result).toEqual({ status: "unknown", repositories: [] });
  });

  it("reports unknown without repositories when the case-insensitive fallback fails", async () => {
    const exec = {
      list: async (args: string[]) => {
        if (args.length === 2 && args[1] === "--full-path") {
          throw new Error("ghq exploded");
        }
        return args[0] === "root" ? "/Users/dai/dev\n" : "";
      },
      get: async () => {},
    };

    const result = await getRepository(exec, { repository: "windhorn/ghq", ssh: false });

    expect(result).toEqual({ status: "unknown", repositories: [] });
  });

  it("reports unknown without repositories when the lookup after a successful `ghq get` fails", async () => {
    let finished = false;
    const exec = {
      list: async (args: string[]) => {
        if (args[0] === "list" && finished) {
          throw new Error("ghq exploded");
        }
        return args[0] === "root" ? "/Users/dai/dev\n" : "";
      },
      get: async () => {
        finished = true;
      },
    };

    const result = await getRepository(exec, { repository: "windhorn/ghq", ssh: false });

    expect(result).toEqual({ status: "unknown", repositories: [] });
  });
});
