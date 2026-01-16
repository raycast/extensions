import { usePromise } from "@raycast/utils";
import { XcodeProject } from "../../models/xcode-project/xcode-project.model";
import { List } from "@raycast/api";
import { XcodeSwiftPackageResolvedService } from "../../services/xcode-swift-package-resolved.service";
import { XcodeSwiftPackageResolvedEntryListItem } from "./xcode-swift-package-resolved-entry-list-item.component";
import { XcodeSwiftPackageResolved } from "../../models/swift-package-resolved/xcode-swift-package-resolved.model";

/**
 * Xcode Swift Package Resolved Entry List
 */
export function XcodeSwiftPackageResolvedEntryList(props: { xcodeProject: XcodeProject }) {
  const packageResolved = usePromise(
    () => XcodeSwiftPackageResolvedService.getPackageResolved(props.xcodeProject.directoryPath),
    [],
    {
      onError: () => Promise.resolve(),
    }
  );
  return (
    <List
      navigationTitle={`${props.xcodeProject.name} Swift Package Dependencies`}
      isShowingDetail={!!packageResolved.data?.entries.length}
      isLoading={packageResolved.isLoading}
    >
      {packageResolved.data && packageResolved.data.entries.length ? (
        <XcodeSwiftPackageResolvedEntryListSection
          packageResolved={packageResolved.data}
          xcodeProject={props.xcodeProject}
        />
      ) : (
        <List.EmptyView title="No Swift Package Dependencies available" />
      )}
    </List>
  );
}

/**
 * Xcode Swift Package Resolved Entry List Section
 */
function XcodeSwiftPackageResolvedEntryListSection(props: {
  packageResolved: XcodeSwiftPackageResolved;
  xcodeProject: XcodeProject;
}) {
  return (
    <List.Section>
      {props.packageResolved.entries.map((entry) => (
        <XcodeSwiftPackageResolvedEntryListItem
          key={entry.location}
          xcodeProject={props.xcodeProject}
          packageResolvedPath={props.packageResolved.path}
          entry={entry}
        />
      ))}
    </List.Section>
  );
}
