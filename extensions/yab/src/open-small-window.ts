import { Clipboard, LaunchProps } from "@raycast/api";
import { attempt } from "./components";
import { addressURL, looksLikeAddress, resolve } from "./data";
import { openSmallWindow } from "./yab";

export default async function Command(props: LaunchProps<{ arguments: Arguments.OpenSmallWindow }>) {
  let query = (props.arguments.query || props.fallbackText || "").trim();
  // Nothing typed: the address on the clipboard, as ⌥⌘N in Yab offers it.
  if (!query) {
    const copied = (await Clipboard.readText())?.trim() ?? "";
    if (looksLikeAddress(copied)) query = addressURL(copied);
  }
  await attempt("Couldn't open the Small Window", async () =>
    openSmallWindow(query ? await resolve(query) : undefined),
  );
}
