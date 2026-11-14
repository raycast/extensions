import { LaunchProps, closeMainWindow, PopToRootType, getApplications, open, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { createWorkspace, ROTARA_SITE } from "./rotara";

export default async function Command(props: LaunchProps<{ arguments: Arguments.NewWorkspace }>) {
  const name = props.arguments.name.trim();
  if (!name) return;
  try {
    // Without the app, rotara:// opens nothing: say so and link the download.
    const installed = (await getApplications()).some((a) => a.bundleId === "com.rotara.app");
    if (!installed) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Rotara isn't installed",
        primaryAction: { title: "Get Rotara", onAction: () => open(ROTARA_SITE) },
      });
      return;
    }
    await createWorkspace(name);
    await closeMainWindow({ popToRootType: PopToRootType.Immediate });
  } catch (error) {
    await showFailureToast(error, { title: "Couldn't create the workspace" });
  }
}
