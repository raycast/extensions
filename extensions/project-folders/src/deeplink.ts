import { environment } from "@raycast/api";
import { createDeeplink } from "@raycast/utils";

// `createDeeplink` emits the stable `raycast://` scheme. Raycast Beta also claims
// `raycast://`, so when both apps are installed macOS may route a `raycast://` link to a
// stable install that lacks this (dev) extension - surfacing as "No enabled command found".
// Beta owns the unambiguous `raycast-x://` scheme; detect Beta via its support path
// (`com.raycast-x.macos`) and rewrite to it so the copied link targets the running app.
// See docs/adr/0002-deeplink-by-gid.md.
export function projectDeeplink(gid: string): string {
  const url = createDeeplink({ command: "search-projects", context: { gid } });
  if (environment.supportPath.includes("com.raycast-x")) {
    return url.replace(/^raycast:\/\//, "raycast-x://");
  }
  return url;
}
