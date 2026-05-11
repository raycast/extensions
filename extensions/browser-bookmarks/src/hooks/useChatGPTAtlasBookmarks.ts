import { homedir } from "os";

import { BROWSERS_BUNDLE_ID } from "./useAvailableBrowsers";
import useChromiumBookmarks from "./useChromiumBookmarks";

const CHATGPT_ATLAS_PATH = `${homedir()}/Library/Application Support/com.openai.atlas/browser-data/host`;

export default function useChatGPTAtlasBookmarks(enabled: boolean) {
  return useChromiumBookmarks(enabled, {
    path: CHATGPT_ATLAS_PATH,
    browserName: "ChatGPT Atlas",
    browserIcon: "chatgpt-atlas.png",
    browserBundleId: BROWSERS_BUNDLE_ID.chatGPTAtlas,
  });
}
