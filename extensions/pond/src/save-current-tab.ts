import { browserTabUrl, saveWithToast } from "./lib/capture";

export default async function Command() {
  await saveWithToast(async () => {
    const url = await browserTabUrl();
    if (!url) throw new Error("Open a web page in Safari, Chrome, Arc, or another browser, then try again.");
    return url;
  });
}
