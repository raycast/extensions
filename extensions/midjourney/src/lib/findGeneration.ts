import { MJMessage } from "midjourney";
import { Generation } from "../types";
import { client } from "./client";
import { UriToHash, content2progress, formatOptions } from "./utils";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function findGeneration(data: any, gen: Generation) {
  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    if (item.author?.id === client.config.BotId && item.content?.includes(gen.prompt)) {
      const itemTimestamp = new Date(item.timestamp).getTime();
      if (itemTimestamp < gen.timestamp) {
        // Old message
        continue;
      }
      if (item.attachments.length === 0) {
        // No attachment
        break;
      }
      const uri = item.attachments[0].url;
      if (item.attachments[0].filename.startsWith("grid") || item.components.length === 0) {
        const progress = content2progress(item.content);
        console.log(uri, progress);

        return { uri, progress };
      }

      const content = item.content.split("**")[1];

      const { proxy_url, width, height } = item.attachments[0];
      const msg: MJMessage = {
        content,
        id: item.id,
        uri,
        proxy_url,
        flags: item.flags,
        hash: UriToHash(uri),
        progress: "done",
        options: formatOptions(item.components),
        width,
        height,
      };
      return msg;
    }
  }
}
