import { Color, Icon, showToast, Toast } from "@raycast/api";
import { getCertificates, getConfig, pathExists, sitesPath } from "./general";
import fs, { Dirent } from "fs";
import { homedir } from "os";
import { Site } from "../types/entities";

/**
 * Return list of sites and return them formatted
 * Will work for symlink and normal site paths.
 *
 * @param {string} path
 * @returns {Site[]}
 */
export function getSites(path: string): Site[] {
  const config = getConfig();
  const sites = fs.readdirSync(path, { withFileTypes: true });
  const certs = getCertificates();

  return sites
    .map((site: Dirent): Site => {
      const sitePath = `${path}/${site.name}`;

      const realPath = fs.realpathSync(sitePath);
      const prettyPath = realPath.replace(homedir(), "~");

      return {
        name: site.name,
        path: realPath,
        prettyPath: prettyPath,
        secured: false,
        url: "",
      };
    })
    .filter((site: Site) => fs.lstatSync(site.path).isDirectory()) // Filter out files
    .filter((site: Site) => !site.name.startsWith(".")) // Filter out hidden files/directories
    .map((site: Site) => {
      const isSecured = certs.some((cert: string) => cert === site.name);
      const url = (isSecured ? "https" : "http") + "://" + site.name + "." + config.tld;

      return {
        name: site.name,
        path: site.path,
        prettyPath: site.prettyPath,
        secured: isSecured,
        url: url,
      };
    });
}

/**
 * Return all parked links in Valet.
 *
 * @returns {Site[]}
 * @see https://laravel.com/docs/master/valet#the-park-command
 */
export async function getParked(): Promise<Site[]> {
  if (!pathExists(sitesPath)) {
    await showToast(Toast.Style.Failure, `Sites path (${sitesPath}) not found`, `Is Laravel Valet installed?`);

    return [];
  }

  const config = getConfig();
  const links = getSites(sitesPath);
  const linkNames = new Set(links.map((link: Site) => link.name));

  const parkedLinks: Site[] = [];
  const paths = config.paths;

  paths.forEach((path: string) => {
    // Ignore the default valet path
    if (path === sitesPath) {
      return;
    }

    const sites = getSites(path) ?? [];
    sites.forEach((site: Site) => {
      if (!linkNames.has(site.name)) {
        parkedLinks.push(site);
      }
    });
  });

  return links.concat(parkedLinks);
}

export async function getSite(siteId: string): Promise<Site | undefined> {
  const sites = await getParked();

  return sites.find((site: Site) => getUniqueId(site) === siteId);
}

export function isSecured(site: Site): boolean {
  return site.secured;
}

export function getSecuredIcon(site: Site): { source: Icon; tintColor: Color } {
  return {
    source: isSecured(site) ? Icon.Lock : Icon.LockDisabled,
    tintColor: isSecured(site) ? Color.Green : Color.Red,
  };
}

export function getSecuredTag(site: Site): { color: Color; value: string | null | undefined } {
  return {
    color: isSecured(site) ? Color.Green : Color.Red,
    value: undefined,
  };
}

export function getSecuredTooltip(site: Site): string {
  return isSecured(site) ? "Site is secured using the `valet secure` command" : "Site is not secured";
}

export function getReadmeContents(site: Site): string | null {
  const files = ["README.md", "readme.md", "Readme.md"];

  for (const file of files) {
    const path = `${site.path}/${file}`;

    if (fs.existsSync(path)) {
      return fs.readFileSync(path, "utf8");
    }
  }

  return null;
}

export function removeProtocolFromUrl(url: string) {
  return url.replace(/(^\w+:|^)\/\//, "");
}

export function getUniqueId(site: Site): string {
  return (removeProtocolFromUrl(site.url) + site.path)
    .replace(/[^a-z0-9]/gi, "-")
    .toLowerCase()
    .replace(/-+/g, "-");
}
