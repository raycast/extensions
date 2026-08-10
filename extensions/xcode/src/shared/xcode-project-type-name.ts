import { XcodeProjectType } from "../models/xcode-project/xcode-project-type.model";

/**
 * Xcode Project Type Name
 * @param xcodeProjectType The XcodeProjectType
 */
export function XcodeProjectTypeName(xcodeProjectType: XcodeProjectType): string {
  switch (xcodeProjectType) {
    case XcodeProjectType.project:
      return "Project";
    case XcodeProjectType.workspace:
      return "Workspace";
    case XcodeProjectType.swiftPackage:
      return "Swift Package";
    case XcodeProjectType.swiftPlayground:
      return "Playground";
  }
}
