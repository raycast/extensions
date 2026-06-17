import { XcodeProjectType } from "./xcode-project-type.model";

/**
 * A XcodeProject
 */
export interface XcodeProject {
  /**
   * The name of the XcodeProject
   */
  name: string;
  /**
   * The XcodeProjectType
   */
  type: XcodeProjectType;
  /**
   * The directory path
   */
  directoryPath: string;
  /**
   * The file path
   */
  filePath: string;
  /**
   * The date when the project was last used or opened
   */
  lastUsed?: Date;
  /**
   * The keywords
   */
  keywords: string[];
}
