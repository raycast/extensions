import { showToast, ToastStyle, Toast } from "@raycast/api";
import fetch from "node-fetch";
import { ISite } from "../Site";
import { sortBy, mapKeys, camelCase } from "lodash";
import { IServer } from "../Server";
import { checkServerisOnline } from "../helpers";
import { FORGE_API_URL } from "../config";

function theHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/x-www-form-urlencoded",
    Accept: "application/json",
  };
}

export const Site = {
  async getAll(server: IServer) {
    const headers = theHeaders(server.apiToken);
    try {
      const response = await fetch(`${FORGE_API_URL}/servers/${server.id}/sites`, {
        method: "get",
        headers,
      });
      const siteData = (await response.json()) as SitesResponse;
      let sites = siteData?.sites ?? [];
      // do a check to see if the server is returning 200
      sites = await Promise.all(
        sites.map(async (s) => {
          s.isOnline = await checkServerisOnline([...s.aliases, s.name]);
          return s;
        })
      );
      // eslint-disable-next-line
      // @ts-expect-error Not sure how to convert Dictionary from lodash to IServer
      sites = sites.map((s) => mapKeys(s, (_, k) => camelCase(k)) as ISite);
      return sortBy(sites, "name") as ISite[];
    } catch (error: unknown) {
      showToast(ToastStyle.Failure, (error as ErrorEvent).message);
      return;
    }
  },
  async get(site: ISite, server: IServer) {
    const headers = theHeaders(server.apiToken);
    try {
      const response = await fetch(`${FORGE_API_URL}/servers/${server.id}/sites/${site.id}`, {
        method: "get",
        headers,
      });
      const siteData = (await response.json()) as SitesResponse;
      // eslint-disable-next-line
      // @ts-expect-error Not sure how to convert Dictionary from lodash to IServer
      return mapKeys(siteData["site"], (_, k) => camelCase(k)) as ISite;
    } catch (error: unknown) {
      showToast(ToastStyle.Failure, (error as ErrorEvent).message);
      return;
    }
  },
  async deploy(site: ISite, server: IServer) {
    const headers = theHeaders(server.apiToken);
    const toast = new Toast({ style: ToastStyle.Animated, title: "Deploying..." });
    try {
      toast.show();
      await fetch(`${FORGE_API_URL}/servers/${server.id}/sites/${site.id}/deployment/deploy`, {
        method: "post",
        headers,
      });
      await new Promise((resolve) => setTimeout(resolve, 3000));
      toast.hide();
    } catch (error: unknown) {
      showToast(ToastStyle.Failure, (error as ErrorEvent).message);
      return;
    }
  },
  async getConfig(type: "env" | "nginx", site: ISite, server: IServer) {
    const headers = theHeaders(server.apiToken);
    try {
      const response = await fetch(`${FORGE_API_URL}/servers/${server.id}/sites/${site.id}/${type}`, {
        method: "get",
        headers,
      });
      const resource = await response.text();
      // Adding <pre> here seems to convert the file into a readable markdown format
      return resource ? `<pre><!-- ${type} file begin -->\n\n${resource}` : "Nothing found";
    } catch (error: unknown) {
      showToast(ToastStyle.Failure, "There was an error.");
      return (error as ErrorEvent).message;
    }
  },
};

type SitesResponse = {
  sites: ISite[];
};
