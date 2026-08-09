import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, describe, expect, it } from "vitest";
import { findHeliumExecutable, getWindowsInstallRoots, getWindowsUserDataPath } from "../../src/utils/platform";

let tempDir: string | undefined;

/**
 * Lay out a Windows-style install (`<root>\imput\Helium\Application\chrome.exe`)
 * under a temp directory and return the directory to use as `%LOCALAPPDATA%`.
 */
function makeInstallRoot(): string {
  tempDir = mkdtempSync(join(tmpdir(), "helium-platform-test-"));
  const applicationDir = join(tempDir, "imput", "Helium", "Application");
  mkdirSync(applicationDir, { recursive: true });
  writeFileSync(join(applicationDir, "chrome.exe"), "");
  return tempDir;
}

afterEach(() => {
  if (tempDir) rmSync(tempDir, { recursive: true, force: true });
  tempDir = undefined;
});

describe("Windows install discovery", () => {
  it("probes the per-user location before the machine-wide ones", () => {
    const roots = getWindowsInstallRoots({
      LOCALAPPDATA: "C:\\local",
      PROGRAMFILES: "C:\\program",
      "PROGRAMFILES(X86)": "C:\\program86",
    });

    expect(roots).toEqual([
      join("C:\\local", "imput", "Helium"),
      join("C:\\program", "imput", "Helium"),
      join("C:\\program86", "imput", "Helium"),
    ]);
  });

  it("skips roots whose environment variable is unset", () => {
    expect(getWindowsInstallRoots({ PROGRAMFILES: "C:\\program" })).toEqual([join("C:\\program", "imput", "Helium")]);
  });

  it("finds the Chromium executable under an install root", () => {
    const root = makeInstallRoot();

    expect(findHeliumExecutable({ override: undefined, env: { LOCALAPPDATA: root } })).toBe(
      join(root, "imput", "Helium", "Application", "chrome.exe"),
    );
  });

  it("prefers an override that exists over the detected install", () => {
    const root = makeInstallRoot();
    const portable = join(root, "portable.exe");
    writeFileSync(portable, "");

    expect(findHeliumExecutable({ override: portable, env: { LOCALAPPDATA: root } })).toBe(portable);
  });

  it("ignores an override pointing at a missing file", () => {
    const root = makeInstallRoot();

    expect(findHeliumExecutable({ override: join(root, "nope.exe"), env: { LOCALAPPDATA: root } })).toBe(
      join(root, "imput", "Helium", "Application", "chrome.exe"),
    );
  });

  it("returns undefined when Helium is not installed", () => {
    tempDir = mkdtempSync(join(tmpdir(), "helium-platform-test-"));

    expect(findHeliumExecutable({ override: undefined, env: { LOCALAPPDATA: tempDir } })).toBeUndefined();
  });
});

describe("getWindowsUserDataPath", () => {
  it("derives the profile root from the resolved executable", () => {
    const root = makeInstallRoot();

    expect(getWindowsUserDataPath({ override: undefined, env: { LOCALAPPDATA: root } })).toBe(
      join(root, "imput", "Helium", "User Data"),
    );
  });

  it("follows a portable override to its own profile root", () => {
    const root = makeInstallRoot();
    const portableApplication = join(root, "Portable", "Application");
    mkdirSync(portableApplication, { recursive: true });
    const portableExecutable = join(portableApplication, "chrome.exe");
    writeFileSync(portableExecutable, "");

    expect(getWindowsUserDataPath({ override: portableExecutable, env: { LOCALAPPDATA: root } })).toBe(
      join(root, "Portable", "User Data"),
    );
  });

  it("falls back to the default per-user location when Helium is missing", () => {
    tempDir = mkdtempSync(join(tmpdir(), "helium-platform-test-"));

    expect(getWindowsUserDataPath({ override: undefined, env: { LOCALAPPDATA: tempDir } })).toBe(
      join(tempDir, "imput", "Helium", "User Data"),
    );
  });
});
