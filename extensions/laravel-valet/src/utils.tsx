import fs, { Dirent } from "fs";
import { homedir } from "os";
import { showToast, Toast } from "@raycast/api";

export interface config {
  paths: string[];
  tld: string;
  loopBack: string;
}

export interface site {
  name: string;
  path: string;
  prettyPath: string;
  secured: boolean;
  url: string;
}

export const configPath = `${homedir()}/.config/valet/config.json`;
export const sitesPath = `${homedir()}/.config/valet/Sites`;
export const certsPath = `${homedir()}/.config/valet/Certificates`;

export function pathExists(path: string): boolean {
  return fs.existsSync(path);
}

export function getConfig(): config {
  try {
    return JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch (error) {
    throw new Error(`Could not read config file ${configPath}. Make sure Valet is installed and configured.`);
  }
}

/**
 * Get all certificates from config folder.
 * @see https://laravel.com/docs/master/valet#securing-sites
 *
 * @returns {string[]}
 */
export function getCertificates(): string[] {
  try {
    const config = getConfig();
    const certs = fs.readdirSync(certsPath, { withFileTypes: true });

    return certs
      .filter((cert: Dirent) => cert.name.endsWith(".crt"))
      .map((cert: Dirent) => {
        const certWithoutSuffix = cert.name.slice(0, -4);
        let trimToString = ".";

        // If we have the cert ending in our tld, strip that tld specifically
        // if not, then just strip the last segment for backwards compatibility.
        if (certWithoutSuffix.endsWith(config.tld)) {
          trimToString += config.tld;
        }

        return certWithoutSuffix.slice(0, certWithoutSuffix.lastIndexOf(trimToString));
      });
  } catch (error) {
    throw new Error(`Could not read certs path ${certsPath}. Make sure Valet is installed and configured.`);
  }
}

/**
 * Return list of sites and return them formatted
 * Will work for symlink and normal site paths.
 *
 * @param {string} path
 * @returns {site[]}
 */
export function getSites(path: string): site[] {
  const config = getConfig();
  const sites = fs.readdirSync(path, { withFileTypes: true });
  const certs = getCertificates();

  return sites
    .map((site: Dirent): site => {
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
    .filter((site: site) => fs.lstatSync(site.path).isDirectory()) // Filter out files
    .filter((site: site) => !site.name.startsWith(".")) // Filter out hidden files/directories
    .map((site: site) => {
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
 * @returns {site[]}
 * @see https://laravel.com/docs/master/valet#the-park-command
 */
export async function getParked(): Promise<site[]> {
  if (!pathExists(sitesPath)) {
    await showToast(Toast.Style.Failure, `Sites path (${sitesPath}) not found`, `Is Laravel Valet installed?`);

    return [];
  }

  const config = getConfig();
  const links = getSites(sitesPath);
  const linkNames = new Set(links.map((link: site) => link.name));

  const parkedLinks: site[] = [];
  const paths = config.paths;

  paths.forEach((path: string) => {
    // Ignore the default valet path
    if (path === sitesPath) {
      return;
    }

    const sites = getSites(path) ?? [];
    sites.forEach((site: site) => {
      if (!linkNames.has(site.name)) {
        parkedLinks.push(site);
      }
    });
  });

  return links.concat(parkedLinks);
}

/**
 * Search through all parked sites.
 *
 * @param {string} query
 * @returns {site[]}
 */
export async function searchSites(query: string): Promise<site[]> {
  const sites = (await getParked()) ?? [];

  if (query.length <= 0) {
    return sites;
  }

  const terms = query.split(" ");

  return sites.filter((site: site) => {
    return terms.every((term: string) => {
      return (
        site.name.toLowerCase().includes(term.toLowerCase()) ||
        site.prettyPath.toLowerCase().includes(term.toLowerCase()) ||
        site.url.toLowerCase().includes(term.toLowerCase())
      );
    });
  });
}
