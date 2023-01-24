import os from "node:os";
import { environment } from "@raycast/api";
import Parser from "rss-parser";
import { Topic } from "./types";

const parser = new Parser({
  headers: {
    "User-Agent": `Hacker News Extension, Raycast/${environment.raycastVersion} (${os.type()} ${os.release()})`,
  },
});

export async function getStories(topic: Topic | null) {
  const feed = await parser.parseURL(`https://hnrss.org/${topic}?count=30`);
  return feed.items;
}
