import { describe, expect, it } from "vitest";
import { winSCPExeCandidates, winSCPIniCandidates } from "./paths";

const env: NodeJS.ProcessEnv = {
  PROGRAMFILES: "C:\\Program Files",
  "PROGRAMFILES(X86)": "C:\\Program Files (x86)",
  PATH: "C:\\Windows;C:\\Users\\me\\scoop\\shims",
  APPDATA: "C:\\Users\\me\\AppData\\Roaming",
};

describe("winSCPExeCandidates", () => {
  it("only looks in the configured folder when the preference is set", () => {
    expect(winSCPExeCandidates("D:\\Portable\\WinSCP", env)).toEqual(["D:\\Portable\\WinSCP\\WinSCP.exe"]);
  });

  it("looks in the default installation folders", () => {
    const candidates = winSCPExeCandidates(undefined, env);
    expect(candidates).toContain("C:\\Program Files\\WinSCP\\WinSCP.exe");
    expect(candidates).toContain("C:\\Program Files (x86)\\WinSCP\\WinSCP.exe");
  });

  it("looks on the PATH, where package managers install WinSCP", () => {
    expect(winSCPExeCandidates(undefined, env)).toContain("C:\\Users\\me\\scoop\\shims\\WinSCP.exe");
  });

  it("prefers an installation folder over the PATH", () => {
    const candidates = winSCPExeCandidates(undefined, env);
    expect(candidates.indexOf("C:\\Program Files\\WinSCP\\WinSCP.exe")).toBeLessThan(
      candidates.indexOf("C:\\Users\\me\\scoop\\shims\\WinSCP.exe"),
    );
  });

  it("survives an empty environment", () => {
    expect(() => winSCPExeCandidates(undefined, {})).not.toThrow();
  });
});

describe("winSCPIniCandidates", () => {
  it("prefers the INI next to the executable, as WinSCP does for portable installs", () => {
    expect(winSCPIniCandidates("D:\\Portable\\WinSCP\\WinSCP.exe", env)).toEqual([
      "D:\\Portable\\WinSCP\\WinSCP.ini",
      "C:\\Users\\me\\AppData\\Roaming\\WinSCP.ini",
    ]);
  });
});
