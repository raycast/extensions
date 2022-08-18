import { XcodeProject } from "../../models/xcode-project/xcode-project.model";
import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import tildify from "tildify";
import { XcodeProjectIcon } from "../../shared/xcode-project-icon";
import { XcodeProjectTypeName } from "../../shared/xcode-project-type-name";
import { XcodeService } from "../../services/xcode.service";

/**
 * Xcode Project List Item
 */
export function XcodeProjectListItem(props: { project: XcodeProject; actions?: JSX.Element }): JSX.Element {
  const navigation = useNavigation();
  return (
    <List.Item
      key={props.project.filePath}
      title={props.project.name}
      subtitle={tildify(props.project.filePath)}
      accessories={[{ text: XcodeProjectTypeName(props.project.type) }]}
      keywords={props.project.keywords}
      icon={XcodeProjectIcon(props.project.type)}
      actions={
        props.actions ?? (
          <ActionPanel>
            <Action.Open
              application={XcodeService.bundleIdentifier}
              key="open-with-xcode"
              title="Open with Xcode"
              target={props.project.filePath}
              icon={Icon.Hammer}
              onOpen={navigation.pop}
            />
            <Action.ShowInFinder key="show-in-finder" path={props.project.filePath} />
          </ActionPanel>
        )
      }
    />
  );
}
