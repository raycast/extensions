import { clipboardUrl, saveWithToast } from "./lib/capture";

export default async function Command() {
  await saveWithToast(async () => {
    const url = await clipboardUrl();
    if (!url) throw new Error("Copy a web address that starts with http:// or https://, then try again.");
    return url;
  });
}
