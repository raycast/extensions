import { confirmAlert, getPreferenceValues, LaunchProps, open, showToast, Toast } from "@raycast/api";
import { createEmptyProject } from "./libs/createEmptyProject";
import { getProjectPath } from "./libs/getProjectPath";
import { showFailureToast } from "@raycast/utils";

const { editor } = getPreferenceValues<Preferences>();

export default async function Command(props: LaunchProps<{ arguments: Arguments.CreateProject }>) {
  try {
    if (!editor) {
      await showToast({
        title: "⚠️ Please configure the extension to choose an **Editor** app to use.",
        style: Toast.Style.Failure,
      });
      return;
    }
    const name = props.arguments.name;
    const { success, reason } = await createEmptyProject(name);
    if (
      success &&
      (await confirmAlert({
        title: "Project is created!",
        message: `Do you want to open "${name}" in ${editor.name}?`,
        icon: { fileIcon: editor.path },
        primaryAction: {
          title: "Open",
        },
      }))
    ) {
      await open(getProjectPath(name), editor);
      return;
    }
    if (
      !success &&
      reason === "existent" &&
      (await confirmAlert({
        title: `Failed. Project "${name}" already exists!`,
        message: `Do you want to open "${name}" in ${editor.name}?`,
        icon: { fileIcon: editor.path },
        primaryAction: {
          title: "Open",
        },
      }))
    ) {
      await open(getProjectPath(name), editor);
      return;
    }
  } catch (error) {
    showFailureToast(error, {
      title: `Failed to create project "${props.arguments.name}"`,
    });
  }
}
