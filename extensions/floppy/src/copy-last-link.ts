import { Clipboard, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { listLinks } from "./lib/api";
import { shortUrl } from "./lib/format";

export default async function CopyLastLink() {
  try {
    const last = (await listLinks(10)).find((l) => l.status === "ready");
    if (!last) {
      await showHUD("No links yet");
      return;
    }
    await Clipboard.copy(last.url);
    await showHUD(`Copied ${shortUrl(last.url)} · ${last.name}`);
  } catch (e) {
    await showFailureToast(e, { title: "Couldn't copy your last link" });
  }
}
