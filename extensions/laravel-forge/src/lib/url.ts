import { IRepository, IServer, ISite } from "../types";

export const repositoryLabel = (repository?: IRepository | null) =>
  repository?.url?.replace(/^https?:\/\/[^/]+\//, "") ?? "";

export const findValidUrlsFromSite = (site: ISite) => {
  const urls = [...(site?.aliases ?? []), site?.name ?? ""]
    // filter out any invalid urls
    .filter((url) => {
      try {
        new URL("https://" + url);
        return true;
      } catch {
        return false;
      }
    });
  return urls;
};

const FORGE_APP = "https://forge.laravel.com";

// The dashboard path is org slug, then server slug, then site id, not the numeric server id
export const forgeServerUrl = (server: IServer) =>
  server.org_slug && server.slug ? `${FORGE_APP}/${server.org_slug}/${server.slug}` : undefined;

export const forgeSiteUrl = (server: IServer, siteId: number) => {
  const base = forgeServerUrl(server);
  return base ? `${base}/${siteId}` : undefined;
};

// Tool payloads carry links pre-formatted; the model copies them more reliably than it formats
export const forgeLink = (url: string | undefined, label: string) => url && `[${label}](${url})`;
