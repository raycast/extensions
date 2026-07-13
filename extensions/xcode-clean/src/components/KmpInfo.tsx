import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { useState } from "react";
import { prettyPath } from "../lib/cache";
import { confirmIfNeeded } from "../lib/confirm";
import { formatError } from "../lib/error";
import { deepCleanProject, runGradlewClean } from "../lib/gradle";
import { KmpProject } from "../lib/findKmp";

type Props = { project: KmpProject };

export default function KmpInfo({ project }: Props) {
  const [busy, setBusy] = useState(false);

  async function runQuick() {
    const ok = await confirmIfNeeded(
      `Run ./gradlew clean in ${project.title}?`,
      "Clean Gradle Project",
    );
    if (!ok) return;
    setBusy(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `gradlew clean in ${project.title}`,
    });
    try {
      await runGradlewClean(project.gradlewDir);
      toast.style = Toast.Style.Success;
      toast.title = `Cleaned ${project.title}`;
      await popToRoot();
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Gradle clean failed";
      toast.message = formatError(e);
      setBusy(false);
    }
  }

  async function runDeep() {
    const ok = await confirmIfNeeded(
      `Stop the Gradle daemon, delete every build/ folder, and remove .gradle/ in ${project.title}?`,
      "Deep Clean Gradle Project",
    );
    if (!ok) return;
    setBusy(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Deep clean in ${project.title}`,
    });
    try {
      await deepCleanProject(project.gradlewDir);
      toast.style = Toast.Style.Success;
      toast.title = `Deep cleaned ${project.title}`;
      await popToRoot();
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Deep clean failed";
      toast.message = formatError(e);
      setBusy(false);
    }
  }

  const md = [
    `# ${project.title}`,
    "",
    project.iosParentDir
      ? `KMP module nested inside the iOS project **${project.iosLabel}**.`
      : "Standalone Kotlin Multiplatform / Gradle project.",
    "",
    "## Location",
    "",
    `- **Gradle project:** \`${prettyPath(project.gradlewDir)}\``,
    ...(project.iosParentDir
      ? [`- **iOS project:** \`${prettyPath(project.iosParentDir)}\``]
      : []),
    "",
    "## Quick Clean (`./gradlew clean`)",
    "",
    "Runs the standard Gradle `clean` task. This invokes each subproject's `clean` task, which removes the `build/` directory of every module.",
    "",
    "**Best for**: routine cleanup before a fresh build.",
    "",
    "## Deep Clean",
    "",
    "Bypasses Gradle and forcibly removes every artifact:",
    "",
    "1. Runs `./gradlew --stop` to terminate the Gradle daemon for this project.",
    "2. Recursively deletes every `build/` directory inside the project.",
    "3. Deletes the local `.gradle/` directory at the project root.",
    "",
    "**Best for**: corrupted build state, daemon issues, post-IDE-crash, or when `./gradlew clean` itself fails.",
    "",
    "> Deep Clean does NOT touch `~/.gradle/caches` or `~/.konan`. Clean those with their dedicated commands.",
  ].join("\n");

  return (
    <Detail
      isLoading={busy}
      navigationTitle={project.title}
      markdown={md}
      actions={
        <ActionPanel>
          <Action
            title="Run ./gradlew Clean"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={runQuick}
          />
          <Action
            title="Deep Clean"
            icon={Icon.ExclamationMark}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
            onAction={runDeep}
          />
          <Action.ShowInFinder path={project.gradlewDir} />
        </ActionPanel>
      }
    />
  );
}
