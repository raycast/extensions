import { confirmAlert, getPreferenceValues, openExtensionPreferences, showHUD, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { chooseApp, describeApp, getOpenWarnings, getRunProblem, GodotApp } from "./apps";
import { findGodotApps, launchGodot, readApp } from "./platform";
import { GodotProject } from "./projects";

class GodotNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GodotNotFoundError";
  }
}

// Looked up once per command session; the list of installed apps rarely changes.
let installedApps: Promise<GodotApp[]> | undefined;

async function resolveApp(project?: GodotProject): Promise<GodotApp> {
  const { godotApp } = getPreferenceValues<Preferences>();
  if (godotApp?.path) {
    const app = await readApp(godotApp.path, false);
    if (!app) throw new GodotNotFoundError(`The app chosen in the extension preferences is missing: ${godotApp.path}`);
    return { ...app, name: godotApp.name || app.name };
  }
  installedApps ??= findGodotApps();
  const app = chooseApp(await installedApps, project);
  if (!app) {
    throw new GodotNotFoundError(
      "Install Godot in the Applications folder, or choose the app in the extension preferences.",
    );
  }
  return app;
}

async function showLaunchFailure(error: unknown, title: string) {
  if (error instanceof GodotNotFoundError) {
    await showFailureToast(error, {
      title: "Godot not found",
      primaryAction: { title: "Open Extension Preferences", onAction: () => openExtensionPreferences() },
    });
  } else {
    await showFailureToast(error, { title });
  }
}

async function launch(app: GodotApp, args: string[], hud: string) {
  await showToast({ style: Toast.Style.Animated, title: `Starting ${describeApp(app)}…` });
  await launchGodot(app.path, args);
  await showHUD(hud);
}

export async function openInEditor(project: GodotProject) {
  try {
    const app = await resolveApp(project);
    // A damaged project.godot has no reliable version, so show the problem instead of version warnings.
    const warnings =
      project.status === "ok" ? getOpenWarnings(project, app) : [project.problem ?? "project.godot could not be read."];
    if (warnings.length > 0) {
      const confirmed = await confirmAlert({
        title: `Open ${project.name}?`,
        message: warnings.join("\n\n"),
        primaryAction: { title: "Open Anyway" },
      });
      if (!confirmed) return;
    }
    await launch(app, ["--path", project.path, "--editor"], `Opening ${project.name} in ${describeApp(app)}`);
  } catch (error) {
    await showLaunchFailure(error, "Could not open the project");
  }
}

export async function runProject(project: GodotProject) {
  try {
    if (project.status !== "ok") throw new Error(project.problem);
    // The Project Manager refuses to run a project in these two cases, see ProjectManager::_run_project_confirm().
    if (!project.mainScene) {
      throw new Error("This project has no main scene. Set one in Project Settings > Application > Run.");
    }
    if (!project.hasImportedAssets) {
      throw new Error("Godot hasn't imported this project's assets yet. Open it in the editor once, then try again.");
    }
    const app = await resolveApp(project);
    const problem = getRunProblem(project, app);
    if (problem) throw new Error(problem);
    await launch(app, ["--path", project.path], `Running ${project.name}`);
  } catch (error) {
    await showLaunchFailure(error, "Could not run the project");
  }
}

export async function openProjectManager() {
  try {
    const app = await resolveApp();
    await launch(app, ["--project-manager"], "Opening the Godot Project Manager");
  } catch (error) {
    await showLaunchFailure(error, "Could not open the Project Manager");
  }
}
