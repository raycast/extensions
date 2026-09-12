import fetch from "node-fetch";
import { stat, readFile, writeFile } from "fs/promises";
import { assertNumberProp, assertStringProp, assertArrayProp } from "./typeUtils";
import he from "he";
import { environment, showToast, Toast } from "@raycast/api";
import { join as path_join } from "path";
import { mkdirSync } from "fs";

export const supportPath = (() => {
  try {
    mkdirSync(environment.supportPath, { recursive: true });
  } catch (err) {
    console.log("Failed to create supportPath");
  }
  return environment.supportPath;
})();

export function cachePath(path: string): string {
  return path_join(supportPath, path);
}

const cachePathFile = cachePath("stack_exchange_sites.json");

export type QueryResultItem = {
  id: string;
  title: string;
  subtitle: string;
  url: string;
  accessoryTitle: string;
  icon: string;
  view_count: number;
  answer_count: number;
};

export type SiteData = {
  aliases?: string[];
  styling?: StylingType;
  related_sites?: RelatedSite[];
  site_state: string;
  high_resolution_icon_url?: string;
  favicon_url?: string;
  icon_url?: string;
  audience: string;
  site_url: string;
  api_site_parameter: string;
  logo_url?: string;
  name: string;
  site_type?: string;
};

interface StylingType {
  tag_background_color?: string;
  tag_foreground_color?: string;
  link_color?: string;
}

interface RelatedSite {
  relation: string;
  api_site_parameter?: string;
  site_url?: string;
  name: string;
}

const parseResponse = (item: unknown) => {
  assertNumberProp(item, "question_id");
  assertStringProp(item, "title");
  assertNumberProp(item, "answer_count");
  assertNumberProp(item, "view_count");
  assertStringProp(item, "link");
  assertArrayProp(item, "tags");
  return {
    id: `${item.question_id}`,
    title: `${he.decode(item.title)}`,
    subtitle: `${he.decode(item.tags.join(" "))}`,
    url: `${item.link}`,
    accessoryTitle: `${item.answer_count} Answers`,
    icon: "so.png",
    view_count: parseInt(`${item.view_count}`, 0),
    answer_count: parseInt(`${item.answer_count}`, 0),
  };
};

const parseQuery = (q: string) => {
  const queryItems = q.split(" ");
  const qs = queryItems.filter((c) => !c.startsWith("."));
  const ts = queryItems.filter((c) => c.startsWith("."));

  let qss = "";
  if (qs.length) {
    qss = qs.join(" ");
  }

  let tss = "";
  if (ts.length) {
    tss = ts.map((x) => encodeURIComponent(x.substring(1))).join(";");
  }

  return { qss, tss };
};

export const searchResources = async (q: string, site = "stackoverflow"): Promise<QueryResultItem[]> => {
  const requestOptions = {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Accept-Encoding": "gzip, deflate, br",
    },
  };
  const { qss, tss } = parseQuery(q);
  const query = `https://api.stackexchange.com/2.3/search/advanced?key=U4DMV*8nvpm3EOpvf69Rxw((&site=${site}&page=1&pagesize=20&order=desc&sort=relevance&q=${encodeURIComponent(
    qss,
  )}&tagged=${tss}&filter=default`;
  const response = await fetch(query, requestOptions);
  if (response.status !== 200) {
    const data = (await response.json()) as { message?: unknown } | undefined;
    throw new Error(`${data?.message || "Not OK"}`);
  }
  const data = await response.json();
  assertArrayProp(data, "items");
  return data.items.map(parseResponse).sort(function (a, b) {
    return b.answer_count - a.answer_count || b.view_count - a.view_count;
  });
};

export async function getSites(): Promise<SiteData[]> {
  const requestOptions = {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Accept-Encoding": "gzip, deflate, br",
    },
  };
  async function updateCache(): Promise<SiteData[]> {
    const query = "https://api.stackexchange.com/2.3/sites?pageSize=9999";
    const response = await fetch(query, requestOptions);
    if (response.status !== 200) {
      const data = (await response.json()) as { message?: unknown } | undefined;
      throw new Error(`${data?.message || "Not OK"}`);
    }
    const data = await response.json();
    assertArrayProp(data, "items");
    const saved_data = data.items as SiteData[];
    const fData = saved_data.filter((x) => x.site_type !== "meta_site");
    try {
      await writeFile(cachePathFile, JSON.stringify(fData));
    } catch (err) {
      console.error("Failed to write installed cache:", err);
    }
    return fData;
  }

  async function mtime(path: string): Promise<Date> {
    return (await stat(path)).mtime;
  }

  async function readCache(): Promise<SiteData[]> {
    const cacheTime = await mtime(cachePathFile);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - cacheTime.getTime());

    if (diffTime < 2592000000) {
      const cacheBuffer = await readFile(cachePathFile);
      const fData = JSON.parse(cacheBuffer.toString());
      return fData;
    } else {
      throw "Expired cache";
    }
  }

  let ret: SiteData[] = [];
  try {
    ret = await readCache();
    if (ret.length <= 30) throw "Cache with few sites"; //temp fix to force reloading more sites - this can be removed in a future PR when most users should have ALL sites loaded
  } catch {
    try {
      ret = await updateCache();
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Can not get sites info!",
        message: "Something is not correct with API call to https://api.stackexchange.com/2.3/sites",
      });
    }
  }
  return ret;
}
