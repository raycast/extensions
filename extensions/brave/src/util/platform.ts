import { join } from "path";
import { homedir } from "os";
import { getPreferenceValues } from "@raycast/api";
import { existsSync, statSync } from "fs";
import { execFileSync } from "child_process";

export const isWindows = process.platform === "win32";

export function getBrowserName(): string {
  const { browserOption } = getPreferenceValues<Preferences>();
  return ["Brave Browser", "Brave Browser Beta", "Brave Browser Nightly"].includes(browserOption)
    ? browserOption
    : "Brave Browser";
}

export function getChannelDirectory(): string {
  return getBrowserName()
    .replace("Brave Browser", "Brave-Browser")
    .replace(" Beta", "-Beta")
    .replace(" Nightly", "-Nightly");
}

export function getWindowsUserDataPath(): string {
  const override = getPreferenceValues<Preferences>().userDataPath?.trim();
  if (override) return override;
  const candidates = [join(homedir(), "AppData", "Local"), process.env.LOCALAPPDATA]
    .filter((root): root is string => !!root)
    .map((root) => join(root, "BraveSoftware", getChannelDirectory(), "User Data"));
  return candidates.find((candidate) => existsSync(candidate)) ?? candidates[0];
}

export function requireBraveExecutable(): string {
  const override = getPreferenceValues<Preferences>().bravePath?.trim();
  const isFile = (candidate: string) => {
    try {
      return statSync(candidate).isFile();
    } catch {
      return false;
    }
  };
  if (override) {
    if (isFile(override)) return override;
    throw new Error("The Brave executable path in extension preferences does not point to a file.");
  }
  for (const root of [
    join(homedir(), "AppData", "Local"),
    process.env.LOCALAPPDATA,
    process.env.PROGRAMFILES,
    process.env["PROGRAMFILES(X86)"],
  ]) {
    if (!root) continue;
    const candidate = join(root, "BraveSoftware", getChannelDirectory(), "Application", "brave.exe");
    if (isFile(candidate)) return candidate;
  }
  for (const hive of ["HKCU", "HKLM"]) {
    try {
      const channel = getBrowserName().endsWith(" Beta")
        ? "BraveB"
        : getBrowserName().endsWith(" Nightly")
          ? "BraveN"
          : "Brave";
      const output = execFileSync(
        "reg.exe",
        ["query", `${hive}\\Software\\Clients\\StartMenuInternet\\${channel}\\shell\\open\\command`, "/ve"],
        { encoding: "utf8", windowsHide: true, timeout: 3000, stdio: ["ignore", "pipe", "ignore"] },
      );
      const candidate = output.match(/REG_SZ\s+"([^"]+)"/)?.[1];
      if (candidate && isFile(candidate)) return candidate;
    } catch {
      continue;
    }
  }
  throw new Error(
    "Brave not installed. Set the Brave executable path in extension preferences for a custom installation.",
  );
}
