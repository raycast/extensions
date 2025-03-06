import { getPreferenceValues, type LaunchProps, open } from "@raycast/api";
import { makeDirIfNotExists } from "./utils/makeDirIfNotExists";
import path from "path";
import { showError } from "./utils/toasts";
import { isValidationError } from "./utils/errors";

type ProjectEmptyProps = LaunchProps<{ arguments: Arguments.ProjectEmpty }>;

export default async function ProjectEmpty(props: ProjectEmptyProps) {
  const { projectName } = props.arguments;
  const { projectsLocation, editor } = getPreferenceValues<Preferences.ProjectEmpty>();

  const projectRoot = path.join(projectsLocation, projectName);

  try {
    await makeDirIfNotExists(projectsLocation);
    await makeDirIfNotExists(projectRoot);
  } catch (e) {
    console.error(e);

    if (isValidationError(e)) {
      await showError(e.message);
      return;
    }

    await showError(`failed to create ${projectRoot}`);
    return;
  }

  try {
    await open(projectRoot, editor);
  } catch (e) {
    console.error(e);
    await showError("project was created but failed to open editor");
  }
}
