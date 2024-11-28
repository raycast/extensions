import { Action } from "@raycast/api";
import { XcodeProjectList } from "../xcode-project-list/xcode-project-list.component";
import { XcodeSwiftPackageResolvedEntryList } from "./xcode-swift-package-resolved-entry-list.component";
import { XcodeProjectType } from "../../models/xcode-project/xcode-project-type.model";

/**
 * Xcode View Swift Package Resolved
 */
export function XcodeViewSwiftPackageResolved() {
  return (
    <XcodeProjectList
      key="select-xcode-project"
      navigationTitle="Show Swift Package Dependencies"
      projectTypeFilter={(projectType) => projectType !== XcodeProjectType.swiftPlayground}
      actions={(xcodeProject) => [
        <Action.Push
          key={xcodeProject.filePath}
          title="Show Swift Package Dependencies"
          target={<XcodeSwiftPackageResolvedEntryList xcodeProject={xcodeProject} />}
        />,
      ]}
    />
  );
}
