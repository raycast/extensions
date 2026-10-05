import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, describe, expect, it } from "vitest";
import {
  findHeliumExecutable,
  getWindowsInstallRoots,
  getWindowsUserDataPath,
  parseStartMenuInternetCommands,
} from "../../src/utils/platform";

let tempDir: string | undefined;

/** Keeps every test hermetic — the real registry is never consulted. */
const noRegistry = () => undefined;

function makeTempDir(): string {
  tempDir = mkdtempSync(join(tmpdir(), "helium-platform-test-"));
  return tempDir;
}

/**
 * Lay out a Windows-style install (`<root>\imput\Helium\Application\chrome.exe`)
 * under a temp directory and return the directory to use as `%LOCALAPPDATA%`.
 */
function makeInstallRoot(executableName = "chrome.exe"): string {
  const root = makeTempDir();
  const applicationDir = join(root, "imput", "Helium", "Application");
  mkdirSync(applicationDir, { recursive: true });
  writeFileSync(join(applicationDir, executableName), "");
  return root;
}

afterEach(() => {
  if (tempDir) rmSync(tempDir, { recursive: true, force: true });
  tempDir = undefined;
});

describe("Windows install discovery", () => {
  it("probes the per-user location before the machine-wide ones, without duplicates", () => {
    const roots = getWindowsInstallRoots(
      { LOCALAPPDATA: join("C:\\Users\\me", "AppData", "Local"), PROGRAMFILES: "C:\\program" },
      "C:\\Users\\me",
    );

    expect(roots).toEqual([
      join("C:\\Users\\me", "AppData", "Local", "imput", "Helium"),
      join("C:\\Users\\me", "AppData", "Local", "Helium"),
      join("C:\\program", "imput", "Helium"),
      join("C:\\program", "Helium"),
    ]);
  });

  it("still probes the home-derived root when LOCALAPPDATA points somewhere else", () => {
    // Raycast's Windows extension processes run with LOCALAPPDATA set to
    // AppData\Local\Temp, which is why trusting it alone hid a standard install.
    const roots = getWindowsInstallRoots(
      { LOCALAPPDATA: join("C:\\Users\\me", "AppData", "Local", "Temp") },
      "C:\\Users\\me",
    );

    expect(roots).toEqual([
      join("C:\\Users\\me", "AppData", "Local", "Temp", "imput", "Helium"),
      join("C:\\Users\\me", "AppData", "Local", "Temp", "Helium"),
      join("C:\\Users\\me", "AppData", "Local", "imput", "Helium"),
      join("C:\\Users\\me", "AppData", "Local", "Helium"),
    ]);
  });

  it("derives the local app data root from home when the variable is missing", () => {
    expect(getWindowsInstallRoots({}, "C:\\Users\\me")).toEqual([
      join("C:\\Users\\me", "AppData", "Local", "imput", "Helium"),
      join("C:\\Users\\me", "AppData", "Local", "Helium"),
    ]);
  });

  it("finds a standard install even when LOCALAPPDATA is redirected to Temp", () => {
    const home = makeTempDir();
    const applicationDir = join(home, "AppData", "Local", "imput", "Helium", "Application");
    mkdirSync(applicationDir, { recursive: true });
    writeFileSync(join(applicationDir, "chrome.exe"), "");

    expect(
      findHeliumExecutable({
        override: undefined,
        env: { LOCALAPPDATA: join(home, "AppData", "Local", "Temp") },
        home,
        registryLookup: noRegistry,
      }),
    ).toBe(join(applicationDir, "chrome.exe"));
  });

  it("finds the Chromium executable under an install root", () => {
    const root = makeInstallRoot();

    expect(
      findHeliumExecutable({
        override: undefined,
        env: { LOCALAPPDATA: root },
        home: root,
        registryLookup: noRegistry,
      }),
    ).toBe(join(root, "imput", "Helium", "Application", "chrome.exe"));
  });

  it("also finds a helium.exe, in case the binary is ever rebranded", () => {
    const root = makeInstallRoot("helium.exe");

    expect(
      findHeliumExecutable({
        override: undefined,
        env: { LOCALAPPDATA: root },
        home: root,
        registryLookup: noRegistry,
      }),
    ).toBe(join(root, "imput", "Helium", "Application", "helium.exe"));
  });

  it("prefers an override that exists over the detected install", () => {
    const root = makeInstallRoot();
    const portable = join(root, "portable.exe");
    writeFileSync(portable, "");

    expect(
      findHeliumExecutable({ override: portable, env: { LOCALAPPDATA: root }, home: root, registryLookup: noRegistry }),
    ).toBe(portable);
  });

  it("ignores an override pointing at a missing file", () => {
    const root = makeInstallRoot();

    expect(
      findHeliumExecutable({
        override: join(root, "nope.exe"),
        env: { LOCALAPPDATA: root },
        home: root,
        registryLookup: noRegistry,
      }),
    ).toBe(join(root, "imput", "Helium", "Application", "chrome.exe"));
  });

  it("falls back to the registry when no standard location matches", () => {
    const root = makeTempDir();
    const registered = join(root, "elsewhere.exe");
    writeFileSync(registered, "");

    expect(
      findHeliumExecutable({
        override: undefined,
        env: { LOCALAPPDATA: root },
        home: root,
        registryLookup: () => registered,
      }),
    ).toBe(registered);
  });

  it("rejects an override that points at a directory rather than an executable", () => {
    const root = makeInstallRoot();
    const directory = join(root, "imput", "Helium");

    expect(
      findHeliumExecutable({
        override: directory,
        env: { LOCALAPPDATA: root },
        home: root,
        registryLookup: noRegistry,
      }),
    ).toBe(join(root, "imput", "Helium", "Application", "chrome.exe"));
  });

  it("returns undefined when Helium is not installed", () => {
    const root = makeTempDir();

    expect(
      findHeliumExecutable({
        override: undefined,
        env: { LOCALAPPDATA: root },
        home: root,
        registryLookup: noRegistry,
      }),
    ).toBeUndefined();
  });
});

describe("parseStartMenuInternetCommands", () => {
  it("extracts the quoted executable from a Helium open command", () => {
    const output = [
      "HKEY_CURRENT_USER\\Software\\Clients\\StartMenuInternet\\Helium.IN6Q37LCMAOVNNXHYCUKIH6G6Q\\shell\\open\\command",
      '    (Default)    REG_SZ    "C:\\Users\\me\\AppData\\Local\\imput\\Helium\\Application\\chrome.exe"',
      "",
    ].join("\r\n");

    expect(parseStartMenuInternetCommands(output)).toEqual([
      "C:\\Users\\me\\AppData\\Local\\imput\\Helium\\Application\\chrome.exe",
    ]);
  });

  it("strips trailing arguments and unquoted paths", () => {
    const output = [
      "HKEY_LOCAL_MACHINE\\Software\\Clients\\StartMenuInternet\\Helium\\shell\\open\\command",
      "    (Default)    REG_SZ    C:\\Apps\\Helium\\chrome.exe --profile-directory=Default",
      "",
    ].join("\r\n");

    expect(parseStartMenuInternetCommands(output)).toEqual(["C:\\Apps\\Helium\\chrome.exe"]);
  });

  it("ignores other browsers and non-command keys", () => {
    const output = [
      "HKEY_CURRENT_USER\\Software\\Clients\\StartMenuInternet\\Google Chrome\\shell\\open\\command",
      '    (Default)    REG_SZ    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"',
      "",
      "HKEY_CURRENT_USER\\Software\\Clients\\StartMenuInternet\\Helium.ABC\\Capabilities",
      "    ApplicationName    REG_SZ    Helium",
      "",
    ].join("\r\n");

    expect(parseStartMenuInternetCommands(output)).toEqual([]);
  });
});

describe("getWindowsUserDataPath", () => {
  it("uses the profile root beside a per-user install", () => {
    const root = makeInstallRoot();
    mkdirSync(join(root, "imput", "Helium", "User Data"), { recursive: true });

    expect(
      getWindowsUserDataPath({
        override: undefined,
        env: { LOCALAPPDATA: root },
        home: root,
        registryLookup: noRegistry,
      }),
    ).toBe(join(root, "imput", "Helium", "User Data"));
  });

  it("follows a portable override to its own profile root", () => {
    const root = makeInstallRoot();
    const portableApplication = join(root, "Portable", "Application");
    mkdirSync(portableApplication, { recursive: true });
    const portableExecutable = join(portableApplication, "chrome.exe");
    writeFileSync(portableExecutable, "");
    mkdirSync(join(root, "Portable", "User Data"), { recursive: true });

    expect(
      getWindowsUserDataPath({
        override: portableExecutable,
        env: { LOCALAPPDATA: root },
        home: root,
        registryLookup: noRegistry,
      }),
    ).toBe(join(root, "Portable", "User Data"));
  });

  it("keeps profiles in LOCALAPPDATA for a machine-wide install", () => {
    const root = makeTempDir();
    const programFiles = join(root, "ProgramFiles");
    const applicationDir = join(programFiles, "imput", "Helium", "Application");
    mkdirSync(applicationDir, { recursive: true });
    writeFileSync(join(applicationDir, "chrome.exe"), "");

    const localAppData = join(root, "Local");
    mkdirSync(join(localAppData, "imput", "Helium", "User Data"), { recursive: true });

    expect(
      getWindowsUserDataPath({
        override: undefined,
        env: { LOCALAPPDATA: localAppData, PROGRAMFILES: programFiles },
        home: root,
        registryLookup: noRegistry,
      }),
    ).toBe(join(localAppData, "imput", "Helium", "User Data"));
  });

  it("prefers the real profile over a stray one under a redirected LOCALAPPDATA", () => {
    // Reproduces the bug this ordering exists to prevent: a machine-wide
    // install (so nothing sits beside the executable) on a machine that already
    // has a leftover profile under AppData\Local\Temp.
    const root = makeTempDir();
    const programFiles = join(root, "ProgramFiles");
    const applicationDir = join(programFiles, "imput", "Helium", "Application");
    mkdirSync(applicationDir, { recursive: true });
    writeFileSync(join(applicationDir, "chrome.exe"), "");

    const localAppData = join(root, "AppData", "Local");
    const strayTemp = join(localAppData, "Temp");
    mkdirSync(join(strayTemp, "imput", "Helium", "User Data"), { recursive: true });
    mkdirSync(join(localAppData, "imput", "Helium", "User Data"), { recursive: true });

    expect(
      getWindowsUserDataPath({
        override: undefined,
        env: { LOCALAPPDATA: strayTemp, PROGRAMFILES: programFiles },
        home: root,
        registryLookup: noRegistry,
      }),
    ).toBe(join(localAppData, "imput", "Helium", "User Data"));
  });

  it("falls back to the home-derived location when nothing exists yet", () => {
    // With nothing on disk to probe, the home-derived path is the safer guess:
    // LOCALAPPDATA may be the redirected Temp directory.
    const root = makeTempDir();

    expect(
      getWindowsUserDataPath({
        override: undefined,
        env: { LOCALAPPDATA: join(root, "Temp") },
        home: root,
        registryLookup: noRegistry,
      }),
    ).toBe(join(root, "AppData", "Local", "imput", "Helium", "User Data"));
  });
});
