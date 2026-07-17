import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { XcodeProject } from "../../models/xcode-project/xcode-project.model";
import { XcodeSwiftPackageResolvedEntry } from "../../models/swift-package-resolved/xcode-swift-package-resolved-entry.model";
import { XcodeSwiftPackageResolvedEntryListItemDetail } from "./xcode-swift-package-resolved-entry-list-item-detail.component";
import { XcodeService } from "../../services/xcode.service";

/**
 * Xcode Swift Package Resolved Entry List Item
 */
export function XcodeSwiftPackageResolvedEntryListItem(props: {
  xcodeProject: XcodeProject;
  packageResolvedPath: string;
  entry: XcodeSwiftPackageResolvedEntry;
}) {
  return (
    <List.Item
      title={props.entry.name}
      subtitle={props.entry.version ?? props.entry.branch ?? props.entry.revision}
      actions={
        <ActionPanel>
          {props.entry.location.startsWith("http") ? <Action.OpenInBrowser url={props.entry.location} /> : undefined}
          <Action.ShowInFinder title="Show Package.resolved" path={props.packageResolvedPath} />
          <Action.Open
            application={XcodeService.bundleIdentifier}
            title={`Open ${props.xcodeProject.name} with Xcode`}
            target={props.xcodeProject.filePath}
            icon={Icon.Hammer}
          />
        </ActionPanel>
      }
      detail={<XcodeSwiftPackageResolvedEntryListItemDetail entry={props.entry} />}
    />
  );
}
