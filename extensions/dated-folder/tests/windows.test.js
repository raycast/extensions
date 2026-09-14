// Run with `npm test`. See lib.test.js for the Node version requirement.
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  AUTOMATIC_CLSID,
  CONHOST_CLSID,
  WINDOWS_TERMINAL_CLSIDS,
  chooseLauncher,
  isWindowsTerminal,
  packageFamily,
  parseDelegationTerminal,
  startCommandLine,
  windowsTerminalAlias,
  windowsTerminalCandidates,
} from "../src/windows.ts";

const [WINDOWS_TERMINAL_CLSID, WINDOWS_TERMINAL_PREVIEW_CLSID] = WINDOWS_TERMINAL_CLSIDS;
const THIRD_PARTY_CLSID = "{12345678-90AB-CDEF-1234-567890ABCDEF}";
const LOCAL_APP_DATA = "C:\\Users\\anna\\AppData\\Local";
const SHARED_ALIAS = `${LOCAL_APP_DATA}\\Microsoft\\WindowsApps\\wt.exe`;
const PREVIEW_FAMILY = "Microsoft.WindowsTerminalPreview_8wekyb3d8bbwe";

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

describe("windowsTerminalCandidates", () => {
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

  it("uses only the shared alias when no app was chosen", () => {
    assert.deepEqual(withLocalAppData(() => windowsTerminalCandidates()), [SHARED_ALIAS]);
  });

  // Regression: the shared alias could belong to stable while the user picked Preview.
  it("tries the chosen package's own alias before the shared one", () => {
    assert.deepEqual(
      withLocalAppData(() => windowsTerminalCandidates({ path: "", windowsAppId: `${PREVIEW_FAMILY}!App` })),
      [`${LOCAL_APP_DATA}\\Microsoft\\WindowsApps\\${PREVIEW_FAMILY}\\wt.exe`, SHARED_ALIAS],
    );
  });

  it("keeps a path outside the package store but skips one inside it", () => {
    assert.deepEqual(withLocalAppData(() => windowsTerminalCandidates({ path: "D:\\Tools\\WindowsTerminal\\wt.exe" })), [
      "D:\\Tools\\WindowsTerminal\\wt.exe",
      SHARED_ALIAS,
    ]);
    assert.deepEqual(
      withLocalAppData(() =>
        windowsTerminalCandidates({
          path: "C:\\Program Files\\WindowsApps\\Microsoft.WindowsTerminal_1.22.0.0_x64__8wekyb3d8bbwe\\wt.exe",
        }),
      ),
      [SHARED_ALIAS],
    );
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

describe("chooseLauncher", () => {
  it("starts Windows Terminal when it is the default or Windows decides", () => {
    assert.equal(chooseLauncher(WINDOWS_TERMINAL_CLSID, true), "windows-terminal");
    assert.equal(chooseLauncher(WINDOWS_TERMINAL_PREVIEW_CLSID, true), "windows-terminal");
    assert.equal(chooseLauncher(AUTOMATIC_CLSID, true), "windows-terminal");
    assert.equal(chooseLauncher(undefined, true), "windows-terminal");
  });

  it("opens a PowerShell console when the console host is the default", () => {
    assert.equal(chooseLauncher(CONHOST_CLSID, true), "powershell");
  });

  // A host we cannot start ourselves still gets the window: Windows delegates the console to it.
  it("opens a PowerShell console for a default terminal it does not recognise", () => {
    assert.equal(chooseLauncher(THIRD_PARTY_CLSID, true), "powershell");
  });

  it("opens a PowerShell console when Windows Terminal is not installed, whatever the setting", () => {
    assert.equal(chooseLauncher(WINDOWS_TERMINAL_CLSID, false), "powershell");
    assert.equal(chooseLauncher(undefined, false), "powershell");
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
