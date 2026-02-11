import { useCachedPromise } from "@raycast/utils";
import { List } from "@raycast/api";
import { useState } from "react";
import { XcodeRuntimeService } from "../../services/xcode-runtime.service";
import { XcodeRuntimePlatformFilter } from "../../models/xcode-runtime/xcode-runtime-platform-filter.model";
import { XcodeRuntimePlatformDropdown } from "./xcode-runtime-list-dropdown.component";
import { XcodeRuntimeListItem } from "./xcode-runtime-list-item.component";

export function XcodeRuntimeList() {
  const [runtimePlatformFilter, setRuntimePlatformFilter] = useState<XcodeRuntimePlatformFilter>(
    XcodeRuntimePlatformFilter.all
  );
  const runtimeGroups = useCachedPromise(XcodeRuntimeService.xcodeRuntimeGroups, [runtimePlatformFilter]);

  const onRuntimePlatformFilterChange = (newValue: XcodeRuntimePlatformFilter) => {
    setRuntimePlatformFilter(newValue);
  };
  return (
    <List
      isLoading={runtimeGroups.isLoading}
      searchBarAccessory={
        <XcodeRuntimePlatformDropdown onRuntimePlatformFilterChange={onRuntimePlatformFilterChange} />
      }
    >
      {runtimeGroups.data?.map((runtimeGroup) => {
        return (
          <List.Section key={runtimeGroup.platform} title={runtimeGroup.platform}>
            {runtimeGroup.runtimes.map((runtime) => (
              <XcodeRuntimeListItem
                runtime={runtime}
                revalidate={runtimeGroups.revalidate}
                key={runtime.buildVersion}
              />
            ))}
          </List.Section>
        );
      })}
    </List>
  );
}
