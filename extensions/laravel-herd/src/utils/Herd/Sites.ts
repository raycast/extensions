import { Site } from "../../lib/types/site";
import { open } from "@raycast/api";
import { Herd } from "../Herd";
import { withCache } from "@raycast/utils";

export class Sites {
  private static getSites = withCache(Sites.fetchSites, {
    maxAge: 60 * 60 * 1000,
  });

  static clearCache() {
    this.getSites.clearCache();
  }

  static async open(): Promise<void> {
    await Herd.runAppleScript<void>(`sites open`);
  }

  static async openWizard(): Promise<void> {
    await Herd.runAppleScript<void>(`sites open with wizard`);
  }

  static async all(): Promise<Site[]> {
    const sitesStr = await this.getSites();

    if (!sitesStr) return [];

    try {
      return JSON.parse(sitesStr) as Site[];
    } catch (e) {
      console.error(e);
      return [];
    }
  }

  static async getRecentSitePath(): Promise<string> {
    return await Herd.General.getConfig<string>("lastSite", "");
  }

  static async getRecentSiteName(): Promise<string> {
    return (await this.getRecentSitePath()).split("/").pop() || "";
  }

  static async getRecentSite(): Promise<Site | null> {
    const recentSite = await Herd.runAppleScript<string>(`get recent site`);

    if (!recentSite || recentSite === "{}") return null;

    try {
      return JSON.parse(recentSite) as Site;
    } catch (e) {
      return null;
    }
  }

  static async openInBrowser(site: Site) {
    await open(site.url);
  }

  static async openInIDE(site: Site): Promise<boolean> {
    await Herd.runAppleScript<boolean>(`site "${site.site}" action "ide"`);
    return true;
  }

  static async openDatabase(site: Site) {
    await Herd.runAppleScript<boolean>(`site "${site.site}" action "database"`);
    return true;
  }

  static async openLogs(sitePath: string) {
    await Herd.runAppleScript<boolean>(`logs "${sitePath}"`);
    return true;
  }

  static async secure(site: Site): Promise<boolean> {
    await Herd.runAppleScript<boolean>(`site "${site.site}" action "secure"`);
    return true;
  }

  static async unsecure(site: Site): Promise<boolean> {
    await Herd.runAppleScript<boolean>(`site "${site.site}" action "unsecure"`);
    return true;
  }

  static async isolate(site: Site, phpVersion: string) {
    await Herd.runAppleScript<boolean>(`site "${site.site}" action "isolate" php "${phpVersion}"`);
    return true;
  }

  static async unisolate(site: Site) {
    await Herd.runAppleScript<boolean>(`site "${site.site}" action "unisolate"`);
    return true;
  }

  static async isolateNode(site: Site, nodeVersion: string) {
    await Herd.runAppleScript<boolean>(`site "${site.site}" action "isolateNode" node "${nodeVersion}"`);
    return true;
  }

  static async unisolateNode(site: Site) {
    await Herd.runAppleScript<boolean>(`site "${site.site}" action "unisolateNode"`);
    return true;
  }

  private static async fetchSites(): Promise<string> {
    return await Herd.runAppleScript<string>(`get sites`);
  }
}
