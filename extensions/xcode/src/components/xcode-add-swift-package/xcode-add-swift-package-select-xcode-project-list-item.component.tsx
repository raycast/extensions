import { XcodeProject } from "../../models/xcode-project/xcode-project.model";
import { Action, ActionPanel, List } from "@raycast/api";
import tildify from "tildify";
import { XcodeProjectTypeName } from "../../shared/xcode-project-type-name";
import { XcodeProjectIcon } from "../../shared/xcode-project-icon";

/**
 * Xcode add Swift Package - Select Xcode Project List Item
 */
export function XcodeAddSwiftPackageSelectXcodeProjectListItem(props: {
  project: XcodeProject;
  onSelect: () => void;
}): JSX.Element {
  return (
    <List.Item
      key={props.project.filePath}
      title={props.project.name}
      subtitle={tildify(props.project.filePath)}
      accessories={[{ text: XcodeProjectTypeName(props.project.type) }]}
      keywords={props.project.keywords}
      icon={XcodeProjectIcon(props.project.type)}
      actions={
        <ActionPanel>
          <Action title="Add Swift Package" onAction={props.onSelect} />
        </ActionPanel>
      }
    />
  );
}
