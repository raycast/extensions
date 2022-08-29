import { Action, useNavigation } from "@raycast/api";
import { XcodeProjectList } from "../xcode-project-list/xcode-project-list.component";
import { XcodeSwiftPackageResolvedEntryList } from "./xcode-swift-package-resolved-entry-list.component";
import { XcodeProjectType } from "../../models/xcode-project/xcode-project-type.model";

/**
 * Xcode View Swift Package Resolved
 */
export function XcodeViewSwiftPackageResolved(): JSX.Element {
  const navigation = useNavigation();
  return (
    <XcodeProjectList
      key="select-xcode-project"
      navigationTitle="Show Swift Package Dependencies"
      projectTypeFilter={(projectType) => projectType !== XcodeProjectType.swiftPlayground}
      actions={(xcodeProject) => [
        <Action
          key="swift-package-resolved-entry-list"
          title="Show Swift Package Dependencies"
          onAction={() => navigation.push(<XcodeSwiftPackageResolvedEntryList xcodeProject={xcodeProject} />)}
        />,
      ]}
    />
  );
}
