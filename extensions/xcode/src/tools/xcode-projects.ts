import { XcodeProjectService } from "../services/xcode-project.service";
import { XcodeProjectType } from "../models/xcode-project/xcode-project-type.model";

type Input = {
  /**
   * The filter to apply to only return Xcode projects of a certain type.
   */
  filter?: XcodeProjectType;
  /**
   * The number of Xcode projects to return.
   */
  limit?: number;
};

/**
 * Returns the Xcode projects.
 * @param input The input.
 */
export default async (input: Input) => {
  let xcodeProjects = await XcodeProjectService.xcodeProjects();
  if (input.filter) {
    xcodeProjects = xcodeProjects.filter((xcodeProject) => xcodeProject.type === input.filter);
  }
  if (input.limit && input.limit > 0) {
    xcodeProjects = xcodeProjects.slice(0, input.limit);
  }
  return xcodeProjects;
};
