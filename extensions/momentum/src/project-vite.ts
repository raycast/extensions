import { ProjectCommand } from "./utils/projectCommand";
import { NodePackageManager } from "./typing/packageMangers";

export default ProjectCommand<Preferences.ProjectVite, Arguments.ProjectVite, NodePackageManager>(async (opts) => {
  const { manager } = opts;
  const { projectName, template } = opts.args;
  const { projectsLocation } = opts.preferences;

  await manager.create({
    template,
    bundler: "vite", // TODO
    projectName: projectName,
    root: projectsLocation, // not root, the root will be created because of create command
  });
});
