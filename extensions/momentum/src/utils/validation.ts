import path from "node:path";
import { makeDirIfNotExists } from "./makeDirIfNotExists";
import { PackageManager, PackageManagerName } from "../typing/packageMangers";
import { getManagerByName } from "./packageManagers";
import { ValidationError } from "./errors";
import { getPreferenceValues, open, showHUD } from "@raycast/api";
import { Project } from "../typing/project";

export interface ValidPrefsResult<T, PM> {
  manager: PM;
  projectRoot: string;
  openEditor: () => Promise<void>;
  data: T;
}

export const validateProjectName = async (name: string) => {
  const validDirectoryName = /^[A-Za-z_][A-Za-z0-9_-]*$/;

  if (!validDirectoryName.test(name)) {
    throw new ValidationError(
      "invalid directory name, name should start with a letter, and can only contain A-Z, a-z, 0-9, underscores & hyphens.",
    );
  }
};

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

  await validateProjectName(args.projectName);

  const editor = async () => {
    if (!prefs.editor) {
      throw new ValidationError("no editor selected in preferences");
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
