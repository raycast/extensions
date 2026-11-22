import { existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";

export const isWindows = process.platform === "win32";
export const DIA_PACKAGE_FAMILY = "TheBrowserCompany.Dia_ttt1ap7aakyb4";
export const DIA_APPLICATION = isWindows ? `${DIA_PACKAGE_FAMILY}!Dia` : "company.thebrowser.dia";

/** Packaged Windows apps redirect LocalAppData into their package's LocalCache. */
export function getUserDataPath() {
  if (!isWindows) return join(homedir(), "Library", "Application Support", "Dia", "User Data");
  const local = process.env.LOCALAPPDATA || join(homedir(), "AppData", "Local");
  const packaged = join(local, "Packages", DIA_PACKAGE_FAMILY, "LocalCache", "Local", "Dia", "User Data");
  const unpackaged = join(local, "Dia", "User Data");
  return [packaged, unpackaged].find((path) => existsSync(join(path, "Local State"))) ?? packaged;
}

export const WINDOWS_AUTOMATION_MESSAGE =
  "This operation is not supported by the experimental Windows backend yet. Tab search in active spaces, focusing and closing tabs, reading page text, switching spaces, and creating windows are available while Dia is open.";

export function requireMacAutomation() {
  if (isWindows) throw new Error(WINDOWS_AUTOMATION_MESSAGE);
}
