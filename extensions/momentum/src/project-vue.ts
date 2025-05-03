import { ProjectCommand } from "./utils/projectCommand";
import { NodePackageManager } from "./typing/packageMangers";

export default ProjectCommand<Preferences.ProjectVue, Arguments.ProjectVue, NodePackageManager>(async (opts) => {
  const { manager } = opts;
  const { projectName } = opts.args;
  const { typescript, projectsLocation } = opts.preferences;

  const template = typescript ? "vue-ts" : "vue";

  await manager.create({
    template,
    bundler: "vite",
    projectName: projectName,
    root: projectsLocation, // not root, the root will be created because of create command
  });
});
