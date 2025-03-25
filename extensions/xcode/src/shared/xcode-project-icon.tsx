import { XcodeProjectType } from "../models/xcode-project/xcode-project-type.model";
import { Image } from "@raycast/api";

/**
 * Xcode Project Icon
 * @param xcodeProjectType The XcodeProjectType
 */
export function XcodeProjectIcon(xcodeProjectType: XcodeProjectType): Image {
  switch (xcodeProjectType) {
    case XcodeProjectType.project:
      return { source: "xcode-project.png" };
    case XcodeProjectType.workspace:
      return { source: "xcode-workspace.png" };
    case XcodeProjectType.swiftPackage:
      return { source: "swift-package.png" };
    case XcodeProjectType.swiftPlayground:
      return { source: "swift-playground.png" };
  }
}
