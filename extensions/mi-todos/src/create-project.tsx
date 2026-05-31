import { getPreferenceValues, showHUD, showToast, Toast } from "@raycast/api";
import { expandHome, resolvePath, createProjectFile } from "./util/storage";

export default async function Command(props: { arguments?: { name?: string } }) {
  const prefs = getPreferenceValues<Preferences>();
  const mitodosDir = resolvePath(expandHome(prefs.mitodosDir));
  const name = (props.arguments?.name ?? "").trim();

  if (!name) {
    await showToast({ style: Toast.Style.Failure, title: "Project name cannot be empty" });
    return;
  }

  try {
    createProjectFile(mitodosDir, name);
    await showHUD(`✓ Project created: ${name}`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("already exists")) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Project already exists",
        message: `mitodos/${name.toLowerCase().replace(/\s+/g, "-")}.md already exists`,
      });
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to create project",
        message: msg,
      });
    }
  }
}
