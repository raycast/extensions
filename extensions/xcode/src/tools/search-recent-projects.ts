import { XcodeProjectService } from "../services/xcode-project.service";
import { XcodeProjectType } from "../models/xcode-project/xcode-project-type.model";

type Input = {
  query?: string;
  filter?: XcodeProjectType;
};

export default async (input: Input) => {
  let xcodeProjects = await XcodeProjectService.xcodeProjects();
  if (input.filter) {
    xcodeProjects = xcodeProjects.filter((xcodeProject) => xcodeProject.type === input.filter);
  }
  if (input.query) {
    const query = input.query;
    xcodeProjects = xcodeProjects.filter((xcodeProject) =>
      xcodeProject.name.toLowerCase().includes(query.toLowerCase())
    );
  }
  return xcodeProjects;
};
