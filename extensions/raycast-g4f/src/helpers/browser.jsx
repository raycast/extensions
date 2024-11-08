import { BrowserExtension } from "@raycast/api";

export const getBrowserTab = async () => {
  try {
    return await BrowserExtension.getContent({ format: "markdown" });
  } catch (e) {
    console.log(e);
    return "Error getting browser tab content.";
  }
};
