import { useCachedPromise } from "@raycast/utils";
import { XcodeReleaseService } from "../../services/xcode-release.service";
import { List } from "@raycast/api";
import { XcodeReleaseListItem } from "./xcode-release-list-item.component";

/**
 * Xcode Release List
 */
export function XcodeReleaseList(): JSX.Element {
  const { isLoading, data } = useCachedPromise(XcodeReleaseService.xcodeReleases);
  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search for Xcode Releases">
      {data?.map((xcodeRelease, index) => {
        return <XcodeReleaseListItem key={index} release={xcodeRelease} index={index} />;
      })}
    </List>
  );
}
