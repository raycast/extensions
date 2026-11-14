// Run with `npm test`. See lib.test.js for the Node version requirement.
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  AUTOMATIC_CLSID,
  CONHOST_CLSID,
  WINDOWS_TERMINAL_CLSID,
  WINDOWS_TERMINAL_FAMILY,
  WINDOWS_TERMINAL_PREVIEW_CLSID,
  WINDOWS_TERMINAL_PREVIEW_FAMILY,
  defaultWindowsTerminal,
  isWindowsTerminal,
  packageFamily,
  packageFamilyFromStorePath,
  parseDelegationTerminal,
  startCommandLine,
  windowsTerminalAlias,
  windowsTerminalCandidates,
} from "../src/windows.ts";

const THIRD_PARTY_CLSID = "{12345678-90AB-CDEF-1234-567890ABCDEF}";
const LOCAL_APP_DATA = "C:\\Users\\anna\\AppData\\Local";
const SHARED_ALIAS = `${LOCAL_APP_DATA}\\Microsoft\\WindowsApps\\wt.exe`;
const STABLE_FAMILY = WINDOWS_TERMINAL_FAMILY;
const PREVIEW_FAMILY = WINDOWS_TERMINAL_PREVIEW_FAMILY;
const STABLE_ALIAS = `${LOCAL_APP_DATA}\\Microsoft\\WindowsApps\\${STABLE_FAMILY}\\wt.exe`;
const PREVIEW_ALIAS = `${LOCAL_APP_DATA}\\Microsoft\\WindowsApps\\${PREVIEW_FAMILY}\\wt.exe`;
const STABLE_STORE_PATH = `C:\\Program Files\\WindowsApps\\Microsoft.WindowsTerminal_1.22.0.0_x64__8wekyb3d8bbwe\\wt.exe`;
const PREVIEW_STORE_PATH = `C:\\Program Files\\WindowsApps\\Microsoft.WindowsTerminalPreview_1.23.0.0_x64__8wekyb3d8bbwe\\wt.exe`;

const withLocalAppData = (fn) => {
  const previous = process.env.LOCALAPPDATA;
  process.env.LOCALAPPDATA = LOCAL_APP_DATA;
  try {
    return fn();
  } finally {
    if (previous === undefined) delete process.env.LOCALAPPDATA;
    else process.env.LOCALAPPDATA = previous;
  }
};

const installed =
  (...exes) =>
  (exe) =>
    exes.includes(exe);

describe("windowsTerminalAlias", () => {
  it("points at the shared app execution alias in the user's WindowsApps folder", () => {
    assert.equal(windowsTerminalAlias(undefined, LOCAL_APP_DATA), SHARED_ALIAS);
  });

  it("points at the package's own alias when a package family is given", () => {
    assert.equal(
      windowsTerminalAlias(PREVIEW_FAMILY, LOCAL_APP_DATA),
      `${LOCAL_APP_DATA}\\Microsoft\\WindowsApps\\${PREVIEW_FAMILY}\\wt.exe`,
    );
  });
});

describe("packageFamily", () => {
  it("takes the identity before the application id", () => {
    assert.equal(packageFamily(`${PREVIEW_FAMILY}!App`), PREVIEW_FAMILY);
    assert.equal(packageFamily(PREVIEW_FAMILY), PREVIEW_FAMILY);
  });

  it("returns undefined for anything that is not a package identity", () => {
    assert.equal(packageFamily(undefined), undefined);
    assert.equal(packageFamily(""), undefined);
    assert.equal(packageFamily("C:\\Program Files\\Alacritty\\alacritty.exe"), undefined);
    assert.equal(packageFamily("Microsoft.WindowsTerminal!App"), undefined);
  });
});

describe("packageFamilyFromStorePath", () => {
  it("reads the family out of the package folder name", () => {
    assert.equal(packageFamilyFromStorePath(STABLE_STORE_PATH), STABLE_FAMILY);
    assert.equal(packageFamilyFromStorePath(PREVIEW_STORE_PATH), PREVIEW_FAMILY);
    // A resource id between the architecture and the publisher hash is dropped like the version.
    assert.equal(
      packageFamilyFromStorePath("C:\\Program Files\\WindowsApps\\Vendor.App_2.0.1.0_arm64_neutral_abcdefghijklm\\app.exe"),
      "Vendor.App_abcdefghijklm",
    );
  });

  it("returns undefined for paths outside the package store", () => {
    assert.equal(packageFamilyFromStorePath(undefined), undefined);
    assert.equal(packageFamilyFromStorePath(""), undefined);
    assert.equal(packageFamilyFromStorePath(SHARED_ALIAS), undefined);
    assert.equal(packageFamilyFromStorePath("D:\\Tools\\WindowsTerminal\\wt.exe"), undefined);
  });
});

describe("windowsTerminalCandidates", () => {
  // Regression: the shared alias may belong to stable while the user picked Preview, or the
  // other way round. A chosen build must never fall back to it, so a missing alias fails loudly.
  it("uses only the chosen package's own alias when the app id names the package", () => {
    assert.deepEqual(
      withLocalAppData(() => windowsTerminalCandidates({ path: "", windowsAppId: `${PREVIEW_FAMILY}!App` })),
      [PREVIEW_ALIAS],
    );
    assert.deepEqual(
      withLocalAppData(() => windowsTerminalCandidates({ path: SHARED_ALIAS, windowsAppId: `${STABLE_FAMILY}!App` })),
      [STABLE_ALIAS],
    );
  });

  it("uses only the chosen package's own alias when the path points into the package store", () => {
    assert.deepEqual(withLocalAppData(() => windowsTerminalCandidates({ path: PREVIEW_STORE_PATH })), [PREVIEW_ALIAS]);
    assert.deepEqual(withLocalAppData(() => windowsTerminalCandidates({ path: STABLE_STORE_PATH })), [STABLE_ALIAS]);
  });

  it("uses the supplied executable alone when it is not a packaged build", () => {
    assert.deepEqual(withLocalAppData(() => windowsTerminalCandidates({ path: "D:\\Tools\\WindowsTerminal\\wt.exe" })), [
      "D:\\Tools\\WindowsTerminal\\wt.exe",
    ]);
  });

  it("falls back to the shared alias only when nothing identifies a build", () => {
    assert.deepEqual(withLocalAppData(() => windowsTerminalCandidates({ path: "" })), [SHARED_ALIAS]);
    assert.deepEqual(withLocalAppData(() => windowsTerminalCandidates({ path: "C:\\Program Files\\WindowsApps\\" })), [
      SHARED_ALIAS,
    ]);
  });
});

describe("isWindowsTerminal", () => {
  it("recognises the alias path, the package identity and the Start menu name", () => {
    assert.ok(
      isWindowsTerminal({ name: "Terminal", path: "C:\\Users\\anna\\AppData\\Local\\Microsoft\\WindowsApps\\wt.exe" }),
    );
    assert.ok(isWindowsTerminal({ name: "Terminal", path: "", windowsAppId: "Microsoft.WindowsTerminal_8wekyb3d8bbwe!App" }));
    assert.ok(isWindowsTerminal({ name: "Windows Terminal", path: "" }));
  });

  it("leaves other terminals alone", () => {
    assert.equal(
      isWindowsTerminal({
        name: "Windows PowerShell",
        path: "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
      }),
      false,
    );
    assert.equal(isWindowsTerminal({ name: "Alacritty", path: "C:\\Program Files\\Alacritty\\alacritty.exe" }), false);
    assert.equal(isWindowsTerminal({ name: "Terminal Emulator", path: "C:\\Apps\\wterm.exe" }), false);
  });
});

describe("parseDelegationTerminal", () => {
  const output = (value) =>
    `\r\nHKEY_CURRENT_USER\\Console\\%%Startup\r\n    DelegationTerminal    REG_SZ    ${value}\r\n\r\n`;

  it("reads the CLSID out of the reg query output", () => {
    assert.equal(parseDelegationTerminal(output(WINDOWS_TERMINAL_CLSID)), WINDOWS_TERMINAL_CLSID);
  });

  it("normalises the CLSID to upper case", () => {
    assert.equal(parseDelegationTerminal(output(CONHOST_CLSID.toLowerCase())), CONHOST_CLSID);
  });

  it("returns undefined when the value is missing or not a CLSID", () => {
    assert.equal(parseDelegationTerminal(""), undefined);
    assert.equal(parseDelegationTerminal("ERROR: The system was unable to find the specified registry key or value."), undefined);
    assert.equal(parseDelegationTerminal(output("garbage")), undefined);
    // The console CLSID lives in a sibling value and must not be picked up.
    assert.equal(
      parseDelegationTerminal(`    DelegationConsole    REG_SZ    ${WINDOWS_TERMINAL_CLSID}\r\n`),
      undefined,
    );
  });
});

describe("defaultWindowsTerminal", () => {
  const resolve = (clsid, ...exes) => withLocalAppData(() => defaultWindowsTerminal(clsid, installed(...exes)));
  const both = [STABLE_ALIAS, PREVIEW_ALIAS, SHARED_ALIAS];

  // Regression: stable and Preview used to collapse into one launcher that started the shared
  // alias, so the setting could name Preview and the extension still open stable.
  it("starts the build the setting names, through that package's own alias", () => {
    assert.deepEqual(resolve(WINDOWS_TERMINAL_CLSID, ...both), { exe: STABLE_ALIAS, name: "Windows Terminal" });
    assert.deepEqual(resolve(WINDOWS_TERMINAL_PREVIEW_CLSID, ...both), {
      exe: PREVIEW_ALIAS,
      name: "Windows Terminal Preview",
    });
  });

  it("never substitutes the other build when the named one is missing", () => {
    // Stable owns the shared alias, the setting says Preview: a PowerShell console it is.
    assert.equal(resolve(WINDOWS_TERMINAL_PREVIEW_CLSID, STABLE_ALIAS, SHARED_ALIAS), undefined);
    assert.equal(resolve(WINDOWS_TERMINAL_CLSID, PREVIEW_ALIAS, SHARED_ALIAS), undefined);
  });

  it("resolves the automatic choice to the stable build", () => {
    assert.deepEqual(resolve(AUTOMATIC_CLSID, ...both), { exe: STABLE_ALIAS, name: "Windows Terminal" });
    assert.deepEqual(resolve(undefined, ...both), { exe: STABLE_ALIAS, name: "Windows Terminal" });
    assert.equal(resolve(AUTOMATIC_CLSID, PREVIEW_ALIAS, SHARED_ALIAS), undefined);
  });

  it("opens a PowerShell console when the console host is the default", () => {
    assert.equal(resolve(CONHOST_CLSID, ...both), undefined);
  });

  // A host we cannot start ourselves still gets the window: Windows delegates the console to it.
  it("opens a PowerShell console for a default terminal it does not recognise", () => {
    assert.equal(resolve(THIRD_PARTY_CLSID, ...both), undefined);
  });

  it("opens a PowerShell console when Windows Terminal is not installed, whatever the setting", () => {
    assert.equal(resolve(WINDOWS_TERMINAL_CLSID), undefined);
    assert.equal(resolve(undefined), undefined);
  });
});

describe("startCommandLine", () => {
  it("takes the working directory and executable from quoted environment variables", () => {
    assert.equal(startCommandLine(), 'start "" /D "%DATED_FOLDER_CWD%" "%DATED_FOLDER_EXE%"');
  });

  it("appends extra arguments after the executable", () => {
    assert.equal(startCommandLine(["-NoLogo"]), 'start "" /D "%DATED_FOLDER_CWD%" "%DATED_FOLDER_EXE%" -NoLogo');
  });
});
