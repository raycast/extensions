import { ProjectCommand } from "./utils/projectCommand";
import { NodePackageManager } from "./typing/packageMangers";

export default ProjectCommand<Preferences.ProjectReact, Arguments.ProjectReact, NodePackageManager>(async (opts) => {
  const { manager } = opts;
  const { projectName } = opts.args;
  const { typescript, projectsLocation } = opts.preferences;

  const template = typescript ? "react-ts" : "react";

  await manager.create({
    template,
    bundler: "vite",
    projectName: projectName,
    root: projectsLocation, // not root, the root will be created because of create command
  });
});
