import { XcodeProject } from "../../models/xcode-project/xcode-project.model";
import { MenuBarExtra, open } from "@raycast/api";
import tildify from "tildify";
import { XcodeProjectIcon } from "../../shared/xcode-project-icon";
import { XcodeService } from "../../services/xcode.service";

/**
 * Xcode Projects Menu Bar Item
 */
export function XcodeProjectsMenuBarItem(props: { project: XcodeProject }) {
  return (
    <MenuBarExtra.Item
      icon={XcodeProjectIcon(props.project.type)}
      title={props.project.name}
      tooltip={tildify(props.project.filePath)}
      onAction={(event: MenuBarExtra.ActionEvent) =>
        open(
          event.type === "left-click" ? props.project.filePath : props.project.directoryPath,
          event.type === "left-click" ? XcodeService.bundleIdentifier : undefined
        )
      }
    />
  );
}
