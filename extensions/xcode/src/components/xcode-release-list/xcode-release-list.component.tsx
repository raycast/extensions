import { useCachedPromise } from "@raycast/utils";
import { XcodeReleaseService } from "../../services/xcode-release.service";
import { List } from "@raycast/api";
import { XcodeReleaseListItem } from "./xcode-release-list-item.component";

/**
 * Xcode Release List
 */
export function XcodeReleaseList() {
  const xcodeReleases = useCachedPromise(XcodeReleaseService.xcodeReleases);
  return (
    <List isLoading={xcodeReleases.isLoading} isShowingDetail={!!xcodeReleases.data?.length}>
      {xcodeReleases.data?.map((xcodeRelease, index) => (
        <XcodeReleaseListItem key={index} release={xcodeRelease} />
      ))}
    </List>
  );
}
