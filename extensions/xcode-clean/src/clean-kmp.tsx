import {
  Action,
  ActionPanel,
  Color,
  Detail,
  getPreferenceValues,
  Icon,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { homedir } from "os";
import { join } from "path";
import { useEffect, useState } from "react";
import KmpInfo from "./components/KmpInfo";
import { confirmIfNeeded } from "./lib/confirm";
import { formatError } from "./lib/error";
import { findKmpProjects, KmpProject } from "./lib/findKmp";
import { deepCleanProject, runGradlewClean } from "./lib/gradle";

type Prefs = { kotlinProjectsRoot?: string };

// Root contains project folders, so allow one extra level compared to
// scanning a single project (gradlew can sit up to 3 levels inside a project).
const SCAN_DEPTH = 4;

function expandPath(p: string): string {
  if (p.startsWith("~")) return join(homedir(), p.slice(1));
  return p;
}

export default function Command() {
  const { kotlinProjectsRoot } = getPreferenceValues<Prefs>();
  const [projects, setProjects] = useState<KmpProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!kotlinProjectsRoot) {
      setError(
        "**Kotlin Projects Root** is not set.\n\nOpen extension preferences and pick the **parent folder that contains all your projects** (e.g. `~/Projects`), not a single project folder (e.g. `~/Projects/my_app`).",
      );
      setLoading(false);
      return;
    }
    const root = expandPath(kotlinProjectsRoot);
    findKmpProjects(root, SCAN_DEPTH)
      .then(setProjects)
      .catch((e) =>
        setError(`Could not scan \`${root}\`:\n\n${formatError(e)}`),
      )
      .finally(() => setLoading(false));
  }, [kotlinProjectsRoot]);

  async function quickClean(p: KmpProject) {
    const ok = await confirmIfNeeded(
      `Run ./gradlew clean in ${p.title}?`,
      "Clean Gradle Project",
    );
    if (!ok) return;
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `gradlew clean in ${p.title}`,
    });
    try {
      await runGradlewClean(p.gradlewDir);
      toast.style = Toast.Style.Success;
      toast.title = `Cleaned ${p.title}`;
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Gradle clean failed";
      toast.message = formatError(e);
    }
  }

  async function deepClean(p: KmpProject) {
    const ok = await confirmIfNeeded(
      `Stop the Gradle daemon, delete every build/ folder, and remove .gradle/ in ${p.title}?`,
      "Deep Clean Gradle Project",
    );
    if (!ok) return;
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Deep clean in ${p.title}`,
    });
    try {
      await deepCleanProject(p.gradlewDir);
      toast.style = Toast.Style.Success;
      toast.title = `Deep cleaned ${p.title}`;
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Deep clean failed";
      toast.message = formatError(e);
    }
  }

  if (error) {
    return (
      <Detail
        markdown={`# Kotlin Multiplatform\n\n${error}`}
        actions={
          <ActionPanel>
            <Action
              title="Open Extension Preferences"
              icon={Icon.Gear}
              onAction={openExtensionPreferences}
            />
          </ActionPanel>
        }
      />
    );
  }

  const insideIos = projects.filter((p) => p.iosParentDir !== null);
  const standalone = projects.filter((p) => p.iosParentDir === null);

  function renderItem(p: KmpProject) {
    return (
      <List.Item
        key={p.gradlewDir}
        icon={{
          source: p.iosParentDir ? Icon.AppWindow : Icon.Hammer,
          tintColor: Color.Green,
        }}
        title={p.title}
        subtitle={p.relativePath}
        keywords={[p.iosLabel ?? "", p.relativePath].filter(Boolean)}
        actions={
          <ActionPanel>
            <Action.Push
              title="Show Info"
              icon={Icon.Info}
              target={<KmpInfo project={p} />}
            />
            <Action
              title="Run ./gradlew Clean"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd"], key: "delete" }}
              onAction={() => quickClean(p)}
            />
            <Action
              title="Deep Clean"
              icon={Icon.ExclamationMark}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
              onAction={() => deepClean(p)}
            />
            <Action.ShowInFinder path={p.gradlewDir} />
            <Action.OpenWith path={p.gradlewDir} />
            <Action
              title="Open Extension Preferences"
              icon={Icon.Gear}
              shortcut={{ modifiers: ["cmd"], key: "," }}
              onAction={openExtensionPreferences}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder="Search KMP project or module…"
    >
      {!loading && projects.length === 0 && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No Gradle projects found"
          description="No gradlew file found under the configured Kotlin Projects Root (scanned 4 levels deep)."
        />
      )}
      <List.Section
        title="Inside iOS Project"
        subtitle={String(insideIos.length)}
      >
        {insideIos.map(renderItem)}
      </List.Section>
      <List.Section title="Standalone" subtitle={String(standalone.length)}>
        {standalone.map(renderItem)}
      </List.Section>
    </List>
  );
}
