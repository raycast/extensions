import { Clipboard } from "@raycast/api";
import { textRequest } from "./lib/payload";
import { reportError, share } from "./lib/quickdrop";
export default async function Command() {
  try {
    await share(textRequest(await Clipboard.readText()));
  } catch (error) {
    await reportError(error);
  }
}
