import { showToast, Toast } from "@raycast/api";
import type { Drive, DrivesResult, Site, SitesResult } from "../types";
import { graphRequest } from "./client";

/**
 * Get SharePoint sites followed by the user
 */
async function getFollowedSites(): Promise<Site[]> {
  try {
    const endpoint = "/me/followedSites?$select=id,name,displayName,webUrl";
    const response = await graphRequest(endpoint);
    const data = (await response.json()) as SitesResult;
    return data.value || [];
  } catch (error) {
    console.error("Get followed sites error:", error);
    return [];
  }
}

/**
 * Get all document libraries (drives) for a specific SharePoint site
 */
async function getSiteDrives(siteId: string, siteName: string): Promise<Drive[]> {
  try {
    const endpoint = `/sites/${siteId}/drives?$select=id,name,driveType,owner,webUrl`;
    const response = await graphRequest(endpoint);
    const data = (await response.json()) as DrivesResult;
    const drives = data.value || [];

    return drives.map((drive) => ({
      ...drive,
      siteDisplayName: siteName,
    }));
  } catch (error) {
    console.error(`Get site drives error for ${siteId}:`, error);
    return [];
  }
}

/**
 * Get all drives accessible to the user (OneDrive + SharePoint sites)
 */
export async function getAllDrives(): Promise<Drive[]> {
  try {
    const primaryDrive = await graphRequest("/me/drive?$select=id,name,driveType,owner,webUrl").then(
      (r) => r.json() as Promise<Drive>,
    );

    const isBusinessAccount = primaryDrive.driveType === "business";

    if (!isBusinessAccount) {
      return [primaryDrive];
    }

    const followedSites = await getFollowedSites();
    const sharepointDrivesArrays = await Promise.all(
      followedSites.map((site) => getSiteDrives(site.id, site.displayName)),
    );
    const sharepointDrives = sharepointDrivesArrays.flat();

    const allDrives = [primaryDrive, ...sharepointDrives];
    const seenIds = new Set<string>();
    const uniqueDrives = allDrives.filter((drive) => {
      if (seenIds.has(drive.id)) return false;
      seenIds.add(drive.id);
      return true;
    });

    uniqueDrives.sort((a, b) => {
      if (a.driveType === "business" && b.driveType !== "business") return -1;
      if (a.driveType !== "business" && b.driveType === "business") return 1;
      return a.name.localeCompare(b.name);
    });

    return uniqueDrives;
  } catch (error) {
    console.error("Get drives error:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to Load Drives",
      message: error instanceof Error ? error.message : "Unknown error occurred",
    });
    return [];
  }
}
