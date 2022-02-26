import { XcodeRelease } from "../../models/release/xcode-release.model";
import { List } from "@raycast/api";
import { xcodeReleaseListItem } from "./xcode-release-list-item.user-interface";

/**
 * Xcode Release List
 * @param xcodeReleases The XcodeReleases that should be shown in the List
 */
export function xcodeReleaseList(xcodeReleases: XcodeRelease[] | undefined): JSX.Element {
  return (
    <List isLoading={!xcodeReleases} searchBarPlaceholder="Search for Xcode Releases">
      {xcodeReleases?.map(xcodeReleaseListItem)}
    </List>
  );
}
