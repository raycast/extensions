/**
 * `isAbortError` decides whether an in-progress toast has to clear itself.
 *
 * It is the one ending that raises no toast of its own — `showBrewFailureToast`
 * returns early on an abort — so a false negative leaves an animated toast
 * spinning after the user has navigated away, and a false positive dismisses
 * the failure toast that a real error just raised.
 */

import { describe, expect, it } from "vitest";
import { getErrorMessage, isAbortError, isNotInstalledRefusal } from "./errors";

describe("isAbortError", () => {
  it("recognizes the abort a DOM AbortController raises", () => {
    // What `AbortController.abort()` produces, and what `execBrew` re-throws.
    const aborted = new Error("The operation was aborted");
    aborted.name = "AbortError";
    expect(isAbortError(aborted)).toBe(true);
  });

  it("does not treat an ordinary failure as an abort", () => {
    expect(isAbortError(new Error("Error: jq not installed"))).toBe(false);
    expect(isAbortError(new TypeError("x is not a function"))).toBe(false);
  });

  it("does not match a non-Error that merely carries the name", () => {
    // A bare object would slip through a `.name` check alone; the toast it
    // would wrongly dismiss belongs to a real error.
    expect(isAbortError({ name: "AbortError" })).toBe(false);
    expect(isAbortError("AbortError")).toBe(false);
    expect(isAbortError(undefined)).toBe(false);
    expect(isAbortError(null)).toBe(false);
  });
});

describe("getErrorMessage", () => {
  it("names the missing repository instead of git's command line", () => {
    // Real stderr from `brew tap jundot/omlx` without its URL.
    const error = Object.assign(new Error("Command failed: brew tap jundot/omlx"), {
      stderr: [
        "==> Tapping jundot/omlx",
        "Cloning into '/opt/homebrew/Library/Taps/jundot/homebrew-omlx'...",
        "remote: Repository not found.",
        "fatal: repository 'https://github.com/jundot/homebrew-omlx/' not found",
        "Error: Failure while executing; `/usr/bin/env GIT_TERMINAL_PROMPT=0 git -c core.hooksPath=/dev/null clone https://github.com/jundot/homebrew-omlx` exited with 128.",
      ].join("\n"),
    });
    expect(getErrorMessage(error)).toBe("No repo found at github.com/jundot/homebrew-omlx");
  });
});

// `brew uninstall` on a package that is already gone, as brew words it on 7.x.
describe("isNotInstalledRefusal", () => {
  it.each([
    // FormulaOrCaskUnavailableError: named-args resolution folds a missing keg into this.
    'Error: No available formula or cask with the name "kitlangton/tap/tailcode". Did you mean kitlangton/tap/scala-update?',
    // NoSuchKegError, with and without its tap.
    "Error: No such keg: /opt/homebrew/Cellar/tailcode",
    "Error: No such keg: /opt/homebrew/Cellar/tailcode from tap kitlangton/tap",
    // CaskNotInstalledError.
    "Error: Cask 'scrawl' is not installed.",
  ])("reads %j as not installed", (stderr) => {
    expect(isNotInstalledRefusal(Object.assign(new Error("Command failed"), { stderr }))).toBe(true);
  });

  it.each([
    "Error: Another active Homebrew process is already in progress.",
    "Error: Refusing to uninstall /opt/homebrew/Cellar/llvm because it is required by rust, which is currently installed.",
    "Error: Homebrew-installed `curl` is not installed for: https://example.com",
  ])("does not read %j as not installed", (stderr) => {
    expect(isNotInstalledRefusal(Object.assign(new Error("Command failed"), { stderr }))).toBe(false);
  });
});
