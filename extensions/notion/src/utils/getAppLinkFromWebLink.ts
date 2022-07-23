import { URL } from "url";

import messages from "../data/messages.json";

export const getAppLinkFromWebLink = async (webLink?: string): Promise<string> => {
  if (webLink) {
    try {
      const link = new URL(webLink.trim());
      if (link.href.includes("www.notion.so")) {
        return link.toString().replace("https", "notion");
      } else {
        throw new Error(messages.invalidNotionURL);
      }
    } catch (error) {
      throw new Error(messages.invalidURL);
    }
  } else {
    throw new Error(messages.emptyClipboard);
  }
};
