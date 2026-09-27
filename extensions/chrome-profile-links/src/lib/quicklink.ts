import { createDeeplink } from "@raycast/utils";
import { ProfileLink } from "./storage";

/** A Raycast quicklink that opens the link through this extension, so it shows up in root search by name. */
export function quicklinkFor(link: ProfileLink) {
  return {
    name: link.title,
    link: createDeeplink({ command: "search-profile-links", context: { linkId: link.id } }),
  };
}
