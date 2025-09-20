import dayjs from "dayjs";
import { Links } from "../types/common";
import { LocalStorage } from "@raycast/api";
import { exec } from "child_process";
export const add_link_handler = async (url: string, title: string) => {
  const format_url = url.startsWith("http") ? url : "https://" + url;
  const links: Links = {
    domain: new URL(format_url).hostname,
    title: title,
    url: format_url,
    read: false,
    add_time: dayjs().format("YYYY-MM-DD HH:mm:ss"),
  };

  const old_links_string = ((await LocalStorage.getItem("links")) as string) ?? "[]";
  const old_links = JSON.parse(old_links_string) as Links[];
  const new_links = old_links.filter((link) => link.url !== format_url);
  new_links.push(links);

  return await LocalStorage.setItem("links", JSON.stringify(new_links));
};

export const update_link_handler = async (links: string) => {
  return await LocalStorage.setItem("links", links);
};

export const open_link_handler = (params: { browser_name?: string; url: string }) => {
  exec(`open -a "${params.browser_name ?? "Google Chrome"}" "${params.url}"`);
};
