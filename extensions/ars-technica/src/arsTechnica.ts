import os from "node:os";
import { environment } from "@raycast/api";
import Parser from "rss-parser";

const parser = new Parser({
  headers: {
    "User-Agent": `Ars Technica Extension, Raycast/${environment.raycastVersion} (${os.type()} ${os.release()})`,
  },
});

export default async function getStories() {
  const feed = await parser.parseURL("https://feeds.arstechnica.com/arstechnica/index");
  return feed.items;
}
