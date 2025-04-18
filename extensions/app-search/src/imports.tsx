import { Color, Icon, Image, Keyboard } from "@raycast/api";
import { exec } from "child_process";
import fs, { readdirSync } from "fs";
import { promisify } from "util";

const ROOT_PATH = "/Users/miles/Code Projects/Personal/Raycast Commands/Extensions/app-search";

export async function runTerminalCommand(command: string) {
  const { stdout, stderr } = await promisify(exec)(command);
  return { stdout, stderr };
}

export async function getRunningApps(): Promise<Set<string>> {
  try {
    const { stdout } = await runTerminalCommand("ps aux | grep -i '.app'");
    const runningApps = stdout
      .split("\n")
      .filter((line) => line.includes(".app/") && line.includes("Contents/MacOS/"))
      .map((line) => {
        const appName = line.substring(0, line.indexOf(".app/"));
        return appName.substring(appName.lastIndexOf("/") + 1);
      })
      .filter((app) => !app.includes("??"))
      .filter((app, index, self) => self.indexOf(app) === index);

    return new Set(runningApps);
  } catch (error) {
    console.error("Error fetching running applications:", error);
    return new Set();
  }
}

export async function asyncGetAppIcon({
  appName,
  appPath,
  checkCache = false,
}: {
  appName: string;
  appPath: string;
  checkCache?: boolean;
}): Promise<string> {
  const specialPrint = (input: string) => {
    const condition = appName.includes("Band");
    if (condition) console.log(input);
  };
  const brokenIconNames: Record<string, string> = {
    Arc: "Arc Browser",
  };
  appName = brokenIconNames[appName] ?? appName;

  const destinationPath = `${ROOT_PATH}/Cached App Icons/${appName}`;
  const specialCases = ["Books"];

  function runSwiftCommand(): Promise<string> {
    return new Promise((resolve, reject) => {
      // Otherwise, extract the icon from the app
      const swiftPath = `${ROOT_PATH}/src/Scripts/GetAppIcons.swift`;
      exec(`swift "${swiftPath}" "${appPath}" "${destinationPath + ".png"}"`, (error, stdout, stderr) => {
        if (error) {
          reject(`Error extracting icon: ${stderr || error.message}`);
        } else {
          const exists = fs.existsSync(destinationPath + ".png");
          if (exists) {
            resolve(destinationPath + ".png");
          } else {
            reject("Failed to find the extracted icon.");
          }
        }
      });
    });
  }

  if (specialCases.includes(appName)) {
    return await runSwiftCommand();
  }

  // Load from cached icons if available
  if (checkCache && fs.existsSync(destinationPath + ".png")) {
    specialPrint(`${appName} has a cached icon file, using ${destinationPath + ".png"}`);
    return destinationPath + ".png";
  }

  const resourcesPath = `${appPath}/Contents/Resources`;
  try {
    // If the app has an Icon? file, use that
    const customIconFileExists = fs.existsSync(`${appPath}/Icon\r`);
    if (customIconFileExists) {
      const { stdout: binaryData, stderr } = await runTerminalCommand(`cp ${appPath}/Icon?/..namedfork/rsrc`);
      if (stderr) {
        console.error("Error copying icon:", stderr);
      }

      const iconBuffer = Buffer.from(binaryData, "utf-8").subarray(260); // Convert to Buffer and use subarray
      fs.writeFileSync(destinationPath + ".icns", iconBuffer.toString("base64")); // Ensure it's a Buffer
      specialPrint(`${appName} has a custom Icon? file, using ${destinationPath + ".icns"}`);
      return destinationPath + ".icns";
    }
    // If the app has no Icon? file, use the first .icns file in the Resources folder
    else {
      const iconFiles = readdirSync(resourcesPath).filter((file) => file.endsWith(".icns"));
      specialPrint(`${appName} has ${iconFiles.length} icns files in ${resourcesPath}`);
      if (iconFiles.length > 1) {
        //search plist.info for CFBundleIconFile
        const plistInfo = fs.readFileSync(`${appPath}/Contents/Info.plist`, "utf-8");
        const iconFile =
          plistInfo
            .match(/<key>CFBundleIconFile<\/key>\s*<string>(.*?)<\/string>/)?.[1]
            ?.trim()
            .replace(/\.icns$/, "") + ".icns"; // Ensure that the name always ends with .icns exactly once
        specialPrint(
          `${appName} ${iconFile !== "undefined.icns" ? "has" : "does not have"} a plist file at ${appPath}/Contents/Info.plist (${iconFile})`,
        );
        if (iconFile !== "undefined.icns") {
          specialPrint(`${appName} has a custom icon file at ${resourcesPath}/${iconFile}`);
          return `${resourcesPath}/${iconFile}`;
        }
      } else if (iconFiles.length == 1) {
        const iconFile = iconFiles[0];
        specialPrint(`${appName} has a default icns file at ${resourcesPath}/${iconFile}`);
        return `${resourcesPath}/${iconFile}`;
      }
    }
  } catch (error) {
    // Do nothing. If there is an error, use next method to get icon
  }

  specialPrint(`${appName} has no custom icon file, making icon from swift file`);
  return await runSwiftCommand();
}

export type ToggleableAppPreferences =
  | "pinnedApps"
  | "hidden"
  | "appsWithoutRunningCheck"
  | "prioritizeRunningApps"
  | "showHidden";

export type SortType = "frecency" | "alphabetical" | "custom";

export interface AppPreferences {
  sortType: SortType;

  quickCommands: Record<string, { modifiers: Keyboard.KeyModifier[]; key: Keyboard.KeyEquivalent }>;
  cachedIconDirectories: Record<string, { default: Image.ImageLike; custom: Image.ImageLike | null }>;
  customNames: Record<string, string>;
  appImportance: Record<string, number>;
  appTags: Record<string, string[]>;

  appsWithoutRunningCheck: string[];
  pinnedApps: string[];
  hidden: string[];

  prioritizeRunningApps: boolean;
  showWebsites: boolean;
  showHidden: boolean;

  customDirectoryOpeners: Record<string, string>;
}

export const defaultPreferences: AppPreferences = {
  sortType: "frecency",

  quickCommands: {},
  cachedIconDirectories: {},
  customNames: {},
  appImportance: {},
  appTags: {},

  appsWithoutRunningCheck: [],
  pinnedApps: [],
  hidden: [],

  prioritizeRunningApps: true,
  showWebsites: true,
  showHidden: false,

  customDirectoryOpeners: {},
};

export function isEmoji(text: string): boolean {
  return /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/.test(text);
}

export async function isValidUrl(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD" });

    if (!res.ok) return false;

    return res.headers.get("Content-Type")?.startsWith("image") ?? false;
  } catch (error) {
    return false;
  }
}

export function isValidFileType(file: string) {
  const validFileTypes = [".png", "Icon?", ".icns"];
  return validFileTypes.some((value) => file.endsWith(value));
}

export function looksLikeFilePath(text: string): boolean {
  return /^(\/|~\/|[a-zA-Z]:\\|\.\/|\.\.\/)/.test(text);
}

export const pathTypes = ["Emoji", "File Path", "Url", "Raycast Icon"] as const;
export function getIconType(icon: Image.ImageLike): (typeof pathTypes)[number] {
  const iconString = icon as string;
  if (iconString?.startsWith("https://")) {
    return "Url";
  }
  if (isEmoji(iconString)) {
    return "Emoji";
  }
  if (looksLikeFilePath(iconString)) {
    return "File Path";
  }
  return "Raycast Icon";
}

export interface HitHistory {
  [key: string]: string[];
}

export type Tag = {
  title: string;
  icon: Icon;
  color: Color.ColorLike;
};

export interface Openable {
  type: "app" | "website" | "directory";
  icon: Image.ImageLike;
  running: boolean;
  name: string;
  path: string;
  id: string;
}

export interface DeepSettings {
  fuzzySearchThresholdDropdown: string;
  showSortOptions: boolean;
  lambdaDecayDropdown: string;
  timeScaleDropdown: string;
  fastMode: boolean;
  showBoltIconForRunningApps: boolean;
  showPinIconForPinnedApps: boolean;
  showEyeIconForHiddenApps: boolean;
  showIdentifierForWebsitesAndDirectories: boolean;
}
