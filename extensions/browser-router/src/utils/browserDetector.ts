import os from "os";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { BrowserProfile } from "../types";
import { getCustomProfiles, getFavoriteIds, getProfileNicknames } from "./storage";
import { ensureAvatarBadgedIcon, getAssetsDir } from "./iconBadgeHelper";

interface ChromiumBrowserDef {
  id: string;
  name: string;
  userDir: string;
  fallbackIcon: string;
  exeCandidates: string[];
}

interface ChromiumProfileInfo {
  name?: string;
  gaia_given_name?: string;
  gaia_name?: string;
  user_name?: string;
}

function findLogoInAppDir(exePath: string): string | undefined {
  if (!exePath || !fs.existsSync(exePath)) return undefined;
  const appDir = path.dirname(exePath);

  const searchDirs = [appDir];
  try {
    const entries = fs.readdirSync(appDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        searchDirs.push(path.join(appDir, entry.name));
      }
    }
  } catch {
    // Ignore read errors
  }

  for (const dir of searchDirs) {
    const candidates = [
      path.join(dir, "VisualElements", "Logo.png"),
      path.join(dir, "VisualElements", "SmallLogo.png"),
      path.join(dir, "VisualElements", "CopilotStable", "Square44x44Logo.scale-100.png"),
      path.join(dir, "VisualElements", "CopilotDev", "Square44x44Logo.scale-100.png"),
      path.join(dir, "Logo.png"),
      path.join(dir, "SmallLogo.png"),
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) {
        return c;
      }
    }
  }
  return undefined;
}

function getExtractedAssetIcon(browserId: string, exePath?: string): string | undefined {
  try {
    const known = ["chrome", "edge", "brave", "vivaldi"];
    if (known.includes(browserId)) {
      return `extracted/${browserId}.png`;
    }
    const assetsDir = getAssetsDir();
    const extractedDir = path.join(assetsDir, "extracted");
    const extractedFile = path.join(extractedDir, `${browserId}.png`);

    if (fs.existsSync(extractedFile)) {
      return `extracted/${browserId}.png`;
    }

    if (exePath && fs.existsSync(exePath)) {
      const diskLogo = findLogoInAppDir(exePath);
      if (diskLogo && fs.existsSync(diskLogo)) {
        if (!fs.existsSync(extractedDir)) {
          fs.mkdirSync(extractedDir, { recursive: true });
        }
        fs.copyFileSync(diskLogo, extractedFile);
        return `extracted/${browserId}.png`;
      }
    }
  } catch {
    // Ignore extraction errors
  }
  return undefined;
}

function findExe(candidates: string[]): string | undefined {
  for (const c of candidates) {
    if (c && fs.existsSync(c)) {
      return c;
    }
  }
  return undefined;
}

function cleanRegistryCmd(cmd: string): string {
  const match = cmd.match(/^"?([^"]+?\.exe)"?/i);
  return match ? match[1] : cmd.replace(/"/g, "").trim();
}

function getBrowsersFromRegistry(): Map<string, string> {
  const map = new Map<string, string>();
  if (process.platform !== "win32") return map;

  const keys = ["HKLM\\Software\\Clients\\StartMenuInternet", "HKCU\\Software\\Clients\\StartMenuInternet"];

  for (const regKey of keys) {
    try {
      const output = execSync(`reg query "${regKey}" /s`, {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
        windowsHide: true,
      });

      const lines = output.split("\r\n");
      let currentSubkey = "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("HKEY_")) {
          currentSubkey = trimmed;
        } else if (trimmed.includes("REG_SZ") && currentSubkey.toLowerCase().includes("shell\\open\\command")) {
          const parts = trimmed.split("REG_SZ");
          if (parts.length > 1) {
            const rawExe = parts[1].trim();
            const cleaned = cleanRegistryCmd(rawExe);
            if (fs.existsSync(cleaned)) {
              const lowerKey = currentSubkey.toLowerCase();
              if (lowerKey.includes("chrome")) map.set("chrome", cleaned);
              else if (lowerKey.includes("edge")) map.set("edge", cleaned);
              else if (lowerKey.includes("brave")) map.set("brave", cleaned);
              else if (lowerKey.includes("vivaldi")) map.set("vivaldi", cleaned);
              else if (lowerKey.includes("firefox")) map.set("firefox", cleaned);
              else if (lowerKey.includes("arc")) map.set("arc", cleaned);
              else if (lowerKey.includes("opera")) map.set("opera", cleaned);
            }
          }
        }
      }
    } catch {
      // Ignore registry query failures
    }
  }

  return map;
}

export async function detectInstalledProfiles(): Promise<BrowserProfile[]> {
  const possibleLocalAppDatas = [
    process.env.LOCALAPPDATA,
    process.env.USERPROFILE ? path.join(process.env.USERPROFILE, "AppData", "Local") : "",
    path.join(os.homedir(), "AppData", "Local"),
  ].filter(Boolean) as string[];

  const possibleAppDatas = [
    process.env.APPDATA,
    process.env.USERPROFILE ? path.join(process.env.USERPROFILE, "AppData", "Roaming") : "",
    path.join(os.homedir(), "AppData", "Roaming"),
  ].filter(Boolean) as string[];

  const localAppData =
    possibleLocalAppDatas.find((p) => fs.existsSync(p)) || path.join(os.homedir(), "AppData", "Local");
  const appData = possibleAppDatas.find((p) => fs.existsSync(p)) || path.join(os.homedir(), "AppData", "Roaming");
  const programFiles = process.env.ProgramFiles || "C:\\Program Files";
  const programFilesX86 = process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";

  const registryBrowsers = getBrowsersFromRegistry();
  const nicknames = await getProfileNicknames();
  const profiles: BrowserProfile[] = [];

  const chromiumConfigs: ChromiumBrowserDef[] = [
    {
      id: "chrome",
      name: "Chrome",
      userDir: path.join(localAppData, "Google", "Chrome", "User Data"),
      fallbackIcon: "extracted/chrome.png",
      exeCandidates: [
        registryBrowsers.get("chrome") || "",
        path.join(programFiles, "Google", "Chrome", "Application", "chrome.exe"),
        path.join(programFilesX86, "Google", "Chrome", "Application", "chrome.exe"),
        path.join(localAppData, "Google", "Chrome", "Application", "chrome.exe"),
      ].filter(Boolean),
    },
    {
      id: "edge",
      name: "Edge",
      userDir: path.join(localAppData, "Microsoft", "Edge", "User Data"),
      fallbackIcon: "extracted/edge.png",
      exeCandidates: [
        registryBrowsers.get("edge") || "",
        path.join(programFilesX86, "Microsoft", "Edge", "Application", "msedge.exe"),
        path.join(programFiles, "Microsoft", "Edge", "Application", "msedge.exe"),
      ].filter(Boolean),
    },
    {
      id: "brave",
      name: "Brave",
      userDir: path.join(localAppData, "BraveSoftware", "Brave-Browser", "User Data"),
      fallbackIcon: "extracted/brave.png",
      exeCandidates: [
        registryBrowsers.get("brave") || "",
        path.join(programFiles, "BraveSoftware", "Brave-Browser", "Application", "brave.exe"),
        path.join(programFilesX86, "BraveSoftware", "Brave-Browser", "Application", "brave.exe"),
        path.join(localAppData, "BraveSoftware", "Brave-Browser", "Application", "brave.exe"),
      ].filter(Boolean),
    },
    {
      id: "vivaldi",
      name: "Vivaldi",
      userDir: path.join(localAppData, "Vivaldi", "User Data"),
      fallbackIcon: "extracted/vivaldi.png",
      exeCandidates: [
        registryBrowsers.get("vivaldi") || "",
        path.join(localAppData, "Vivaldi", "Application", "vivaldi.exe"),
        path.join(programFiles, "Vivaldi", "Application", "vivaldi.exe"),
      ].filter(Boolean),
    },
    {
      id: "arc",
      name: "Arc",
      userDir: path.join(localAppData, "Arc", "User Data"),
      fallbackIcon: "extension-icon.png",
      exeCandidates: [
        registryBrowsers.get("arc") || "",
        path.join(localAppData, "Arc", "Application", "Arc.exe"),
        path.join(localAppData, "Microsoft", "WindowsApps", "Arc.exe"),
      ].filter(Boolean),
    },
    {
      id: "opera",
      name: "Opera",
      userDir: path.join(appData, "Opera Software", "Opera Stable"),
      fallbackIcon: "extension-icon.png",
      exeCandidates: [
        registryBrowsers.get("opera") || "",
        path.join(localAppData, "Programs", "Opera", "launcher.exe"),
        path.join(programFiles, "Opera", "launcher.exe"),
      ].filter(Boolean),
    },
  ];

  for (const config of chromiumConfigs) {
    const exe = findExe(config.exeCandidates);
    if (!exe) continue;

    const extractedIcon = getExtractedAssetIcon(config.id, exe);
    const logoIcon = extractedIcon || findLogoInAppDir(exe);
    const localStatePath = path.join(config.userDir, "Local State");

    const detectedForBrowser: BrowserProfile[] = [];

    if (fs.existsSync(localStatePath)) {
      try {
        const rawJson = fs.readFileSync(localStatePath, "utf8");
        const parsed = JSON.parse(rawJson);
        const infoCache = (parsed?.profile?.info_cache || {}) as Record<string, ChromiumProfileInfo>;

        for (const [profileDir, info] of Object.entries(infoCache)) {
          const profilePath = path.join(config.userDir, profileDir);
          const possiblePics = [
            path.join(profilePath, "Google Profile Picture.png"),
            path.join(profilePath, "Edge Profile Picture.png"),
            path.join(profilePath, "Custom Profile Picture.png"),
          ];
          const diskPic = possiblePics.find((pic) => fs.existsSync(pic));
          const safeProfileId = `${config.id}_${profileDir.replace(/[^a-zA-Z0-9_-]/g, "_")}`;

          // If disk avatar exists, generate/use the badged icon (main browser logo + top-right avatar notification badge)
          // If no custom avatar exists, leave avatarPath undefined so it falls back to native browser logo (logoIcon)
          const avatarPath = diskPic ? ensureAvatarBadgedIcon(config.id, safeProfileId, diskPic) : undefined;

          const rawName = info.name || profileDir;
          const profileId = `${config.id}_${profileDir}`;
          const customName = nicknames[profileId];

          detectedForBrowser.push({
            id: profileId,
            browserId: config.id,
            browserName: config.name,
            profileName: rawName,
            displayName: customName || `${config.name} — ${rawName}`,
            profileDirectory: profileDir,
            executablePath: exe,
            userDataDir: config.userDir,
            iconPath: logoIcon,
            avatarPath,
            fallbackIcon: config.fallbackIcon,
            email: info.user_name || undefined,
          });
        }
      } catch (err: unknown) {
        console.error(`Failed to read Local State for ${config.name}:`, err);
      }
    }

    if (detectedForBrowser.length === 0) {
      const profileId = `${config.id}_Default`;
      const customName = nicknames[profileId];
      detectedForBrowser.push({
        id: profileId,
        browserId: config.id,
        browserName: config.name,
        profileName: "Default",
        displayName: customName || `${config.name} — Default`,
        profileDirectory: "Default",
        executablePath: exe,
        userDataDir: config.userDir,
        iconPath: logoIcon,
        fallbackIcon: config.fallbackIcon,
      });
    }

    profiles.push(...detectedForBrowser);
  }

  // Detect Mozilla Firefox profiles
  const firefoxExe = findExe(
    [
      registryBrowsers.get("firefox") || "",
      path.join(programFiles, "Mozilla Firefox", "firefox.exe"),
      path.join(programFilesX86, "Mozilla Firefox", "firefox.exe"),
    ].filter(Boolean),
  );

  if (firefoxExe) {
    const ffLogo = getExtractedAssetIcon("firefox", firefoxExe) || findLogoInAppDir(firefoxExe);
    const iniPath = path.join(appData, "Mozilla", "Firefox", "profiles.ini");
    let ffProfilesFound = 0;

    if (fs.existsSync(iniPath)) {
      try {
        const iniContent = fs.readFileSync(iniPath, "utf8");
        const sections = iniContent.split(/\[Profile\d+\]/);
        for (let i = 1; i < sections.length; i++) {
          const section = sections[i];
          const nameMatch = section.match(/Name=([^\r\n]+)/);
          if (nameMatch) {
            const profileName = nameMatch[1].trim();
            ffProfilesFound++;
            const profileId = `firefox_${profileName}`;
            const customName = nicknames[profileId];

            profiles.push({
              id: profileId,
              browserId: "firefox",
              browserName: "Firefox",
              profileName,
              displayName: customName || `Firefox — ${profileName}`,
              profileDirectory: profileName,
              executablePath: firefoxExe,
              iconPath: ffLogo,
              fallbackIcon: "extension-icon.png",
            });
          }
        }
      } catch (err: unknown) {
        console.error("Failed to parse Firefox profiles.ini:", err);
      }
    }

    if (ffProfilesFound === 0) {
      const profileId = "firefox_default";
      const customName = nicknames[profileId];
      profiles.push({
        id: profileId,
        browserId: "firefox",
        browserName: "Firefox",
        profileName: "Default",
        displayName: customName || "Firefox — Default",
        profileDirectory: "default",
        executablePath: firefoxExe,
        iconPath: ffLogo,
        fallbackIcon: "extension-icon.png",
      });
    }
  }

  // Merge Custom Profiles
  const customProfiles = await getCustomProfiles();
  for (const cp of customProfiles) {
    const isFirefox =
      cp.browserType === "firefox" ||
      cp.browserId === "firefox" ||
      cp.executablePath.toLowerCase().includes("firefox") ||
      cp.browserName.toLowerCase().includes("firefox");
    const browserId = isFirefox ? "firefox" : cp.browserId || "custom";
    const logoIcon = getExtractedAssetIcon(browserId, cp.executablePath) || findLogoInAppDir(cp.executablePath);
    const customName = nicknames[cp.id];
    profiles.push({
      id: cp.id,
      browserId,
      browserName: cp.browserName,
      profileName: cp.profileName,
      displayName: customName || `${cp.browserName} — ${cp.profileName}`,
      profileDirectory: cp.profileDirectory,
      executablePath: cp.executablePath,
      userDataDir: cp.userDataDir,
      iconPath: logoIcon,
      fallbackIcon: "extension-icon.png",
      isCustom: true,
    });
  }

  // Mark Favorites
  const favIds = await getFavoriteIds();
  for (const p of profiles) {
    p.isFavorite = favIds.includes(p.id);
  }

  return profiles;
}

export async function detectAllProfiles(): Promise<BrowserProfile[]> {
  return detectInstalledProfiles();
}
