import { Application } from "@raycast/api";
import { execSync } from "child_process";
import path from "path";
import { escapeShellPath, fileExists, log } from "./helpers";

// Finds all files related to an application (preferences, caches, etc.)
export async function findRelatedFiles(app: Application): Promise<string[]> {
  const homeDir = process.env.HOME;
  if (!homeDir) throw new Error("HOME environment variable not set");

  let bundleId = "";
  try {
    bundleId = execSync(`mdls -name kMDItemCFBundleIdentifier -raw ${escapeShellPath(app.path)}`)
      .toString()
      .trim();
    log("Found bundle ID:", bundleId);
  } catch (error) {
    log("Failed to get bundle ID:", error);
  }

  const appName = app.name;
  const appNameLower = appName.toLowerCase();
  const appNameNoSpaces = appNameLower.replace(/\s+/g, "");
  const appNameNoSpecialChars = appNameNoSpaces.replace(/[^a-zA-Z0-9]/g, "");

  const commonPaths = [
    `${homeDir}/Library/Application Support/${app.name}`,
    `${homeDir}/Library/Preferences/${app.name}.plist`,
    `${homeDir}/Library/Caches/${app.name}`,
    `${homeDir}/Library/Saved Application State/${app.name}.savedState`,
    `${homeDir}/Library/Preferences/com.${appNameNoSpaces}.plist`,
    `${homeDir}/Library/Preferences/com.${appNameNoSpecialChars}.plist`,
    `${homeDir}/Library/Containers/${app.name}`,
    `${homeDir}/Library/WebKit/${app.name}`,
    `${homeDir}/Library/Logs/${app.name}`,
    `${homeDir}/Library/HTTPStorages/${app.name}`,
    `${homeDir}/Library/Cookies/${app.name}.binarycookies`,
    `${homeDir}/Library/LaunchAgents/${app.name}.plist`,
    `${homeDir}/Library/Application Scripts/${bundleId}`,
    `${homeDir}/Library/Group Containers/${bundleId}`,
    `${homeDir}/Library/Mail/Bundles/${app.name}`,
    `${homeDir}/Library/Preferences/ByHost/${app.name}.*.plist`,
    `/Library/Application Support/${app.name}`,
    `/Library/Preferences/${app.name}.plist`,
    `/Library/Caches/${app.name}`,
    `/Library/LaunchDaemons/${app.name}.plist`,
    `/Library/PrivilegedHelperTools/${app.name}`,
    `/Library/Extensions/${app.name}.kext`,
    `/Library/Input Methods/${app.name}.app`,
    `/Library/PreferencePanes/${app.name}.prefPane`,
    `/Library/QuickLook/${app.name}.qlgenerator`,
    `/Library/Screen Savers/${app.name}.saver`,
    `/Library/Services/${app.name}.service`,
    `/Library/Spotlight/${app.name}.mdimporter`,
    `/Library/StartupItems/${app.name}`,
    `${homeDir}/.${appNameNoSpaces}`,
    `${homeDir}/.${appNameNoSpecialChars}`,
    `/var/db/receipts/${app.name}.plist`,
    `/var/db/receipts/${app.name}.bom`,
    `/var/root/Library/Preferences/${app.name}.plist`,
    `/var/root/Library/Caches/${app.name}`,
    `/private/var/db/receipts/${app.name}.plist`,
    `/private/var/db/receipts/${app.name}.bom`,
  ];

  if (bundleId) {
    const bundlePaths = [
      `${homeDir}/Library/Application Support/${bundleId}`,
      `${homeDir}/Library/Preferences/${bundleId}.plist`,
      `${homeDir}/Library/Caches/${bundleId}`,
      `${homeDir}/Library/Saved Application State/${bundleId}.savedState`,
      `${homeDir}/Library/Containers/${bundleId}`,
      `${homeDir}/Library/WebKit/${bundleId}`,
      `${homeDir}/Library/Logs/${bundleId}`,
      `${homeDir}/Library/HTTPStorages/${bundleId}`,
      `${homeDir}/Library/Cookies/${bundleId}.binarycookies`,
      `${homeDir}/Library/LaunchAgents/${bundleId}.plist`,
      `${homeDir}/Library/Application Scripts/${bundleId}`,
      `${homeDir}/Library/Group Containers/${bundleId}`,
      `${homeDir}/Library/Application Scripts/${bundleId}.ThumbnailShareExtension`,
      `${homeDir}/Library/Application Scripts/${bundleId}.QuickLookShareExtension`,
      `${homeDir}/Library/Containers/${bundleId}.ThumbnailShareExtension`,
      `${homeDir}/Library/Containers/${bundleId}.QuickLookShareExtension`,
      `/Library/Application Support/${bundleId}`,
      `/Library/Preferences/${bundleId}.plist`,
      `/Library/Caches/${bundleId}`,
      `/Library/LaunchDaemons/${bundleId}.plist`,
      `/Library/PrivilegedHelperTools/${bundleId}`,
      `/Library/Extensions/${bundleId}.kext`,
      `/Library/Input Methods/${bundleId}.app`,
      `/Library/PreferencePanes/${bundleId}.prefPane`,
      `/Library/QuickLook/${bundleId}.qlgenerator`,
      `/Library/Screen Savers/${bundleId}.saver`,
      `/Library/Services/${bundleId}.service`,
      `/Library/Spotlight/${bundleId}.mdimporter`,
      `/Library/StartupItems/${bundleId}`,
      `/var/db/receipts/${bundleId}.plist`,
      `/var/db/receipts/${bundleId}.bom`,
      `/var/root/Library/Preferences/${bundleId}.plist`,
      `/var/root/Library/Caches/${bundleId}`,
      `/private/var/db/receipts/${bundleId}.plist`,
      `/private/var/db/receipts/${bundleId}.bom`,
    ];
    commonPaths.push(...bundlePaths);
  }

  const files = new Set<string>();
  for (const location of commonPaths) {
    if (fileExists(location)) {
      log("Found file:", location);
      files.add(location);
    }
  }

  try {
    const infoPlistPath = path.join(app.path, "Contents/Info.plist");
    if (fileExists(infoPlistPath)) {
      const plistContent = execSync(`plutil -convert json -o - ${escapeShellPath(infoPlistPath)}`).toString();
      const plistData = JSON.parse(plistContent);

      const additionalPaths = [
        plistData.CFBundleExecutable,
        plistData.CFBundleIdentifier,
        plistData.CFBundleName,
        plistData.CFBundleDisplayName,
      ]
        .filter(Boolean)
        .map((id) => [
          `${homeDir}/Library/Application Support/${id}`,
          `${homeDir}/Library/Preferences/${id}.plist`,
          `${homeDir}/Library/Caches/${id}`,
          `${homeDir}/Library/Saved Application State/${id}.savedState`,
        ])
        .flat();

      for (const path of additionalPaths) {
        if (fileExists(path)) {
          files.add(path);
        }
      }
    }
  } catch (error) {
    log("Failed to parse Info.plist:", error);
  }

  return Array.from(files);
}
