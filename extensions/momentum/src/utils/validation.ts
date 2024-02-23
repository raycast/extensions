import path from "node:path";
import { makeDirIfNotExists } from "./makeDirIfNotExists";
import { PackageManager, PackageManagerName } from "../typing/packageMangers";
import { getManagerByName } from "./packageManagers";
import { ValidationError } from "./errors";
import { getPreferenceValues, open, showHUD } from "@raycast/api";
import { Project } from "../typing/project";
import { showError } from "./toasts";

export interface ValidPrefsResult<T, PM> {
  manager: PM;
  projectRoot: string;
  openEditor: () => Promise<void>;
  data: T;
}

export const validateProjectRoot = async (root: string, projectDir: string) => {
  const projectRoot = path.join(root, projectDir);

  await makeDirIfNotExists(root);
  await makeDirIfNotExists(projectRoot);

  return projectRoot;
};

export const validateManager = async <PM extends PackageManager>(pkgManager: PackageManagerName): Promise<PM> => {
  const manager = getManagerByName(pkgManager) as PM | null;

  if (!manager) {
    throw new ValidationError(`${pkgManager} is not supported`);
  }

  const packageManagerIsInstalled = await manager.isInstalled();

  if (!packageManagerIsInstalled) {
    throw new ValidationError(`${pkgManager} is not installed`);
  }

  return manager;
};

export const validatePrefs = async <T extends Project, PM extends PackageManager>(
  args: Arguments.ProjectEmpty,
): Promise<ValidPrefsResult<T, PM>> => {
  const prefs = getPreferenceValues<T>();

  const projectRoot = await validateProjectRoot(prefs.projectsLocation, args.projectName);
  const manager: PM = await validateManager(prefs.pkgManager);

  const editor = async () => {
    if (!prefs.editor) {
      await showError("no editor selected in preferences");
      return;
    }

    await showHUD(`opening ${prefs.editor.name}`);
    await open(projectRoot, prefs.editor);
  };

  return {
    manager,
    projectRoot,
    openEditor: editor,
    data: prefs,
  };
};
