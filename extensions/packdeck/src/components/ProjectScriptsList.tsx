import { Action, ActionPanel, Color, getPreferenceValues, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useMemo } from "react";
import { LocalProject, ProjectScript, TerminalApp } from "../types";
import { PACKAGE_MANAGER_META, SCRIPT_CATEGORY_META } from "../lib/constants";
import { buildRunScriptCommand } from "../lib/package-manager";
import { getRecentScripts, recordRecentScript } from "../lib/storage";
import { runCommandInTerminal } from "../lib/terminal";
import { RunScriptArgsForm } from "./RunScriptArgsForm";
import { ScriptOutputView } from "./ScriptOutputView";

interface ProjectScriptsListProps {
  project: LocalProject;
  searchBarAccessory?: List.Props["searchBarAccessory"];
  isNested?: boolean;
}

export function ProjectScriptsList({ project, searchBarAccessory, isNested = false }: ProjectScriptsListProps) {
  const prefs = getPreferenceValues<Preferences>();
  const terminal = (prefs.preferredTerminal ?? "Terminal") as TerminalApp;

  const { data: recentRecords, revalidate: revalidateRecents } = usePromise(getRecentScripts);

  const { recentScripts, otherScripts } = useMemo(() => {
    const recentNames = new Set(
      (recentRecords ?? []).filter((r) => r.projectPath === project.path).map((r) => r.scriptName),
    );
    const recent: ProjectScript[] = [];
    const rest: ProjectScript[] = [];
    for (const s of project.scripts) {
      if (recentNames.has(s.name)) recent.push(s);
      else rest.push(s);
    }
    return { recentScripts: recent, otherScripts: rest };
  }, [project.scripts, project.path, recentRecords]);

  async function launchInTerminal(script: ProjectScript) {
    const cmd = buildRunScriptCommand(project.packageManager, script.name);
    const res = await runCommandInTerminal(project.path, cmd, terminal);
    if (res.launched) {
      await recordRecentScript(project.path, script.name, project.packageManager);
      await revalidateRecents();
    }
    await showToast({
      style: res.launched ? Toast.Style.Success : Toast.Style.Failure,
      title: res.launched ? `Launched "${script.name}" in ${terminal}` : `Failed to launch ${terminal}`,
      message: res.launched ? cmd.display : res.error,
    });
  }

  function renderScriptItem(script: ProjectScript) {
    const cat = SCRIPT_CATEGORY_META[script.category];
    const cmd = buildRunScriptCommand(project.packageManager, script.name);

    const runInlineAction = (
      <Action.Push
        key="inline"
        title="Run Inline in Raycast"
        icon={Icon.Play}
        target={<ScriptOutputView project={project} scriptName={script.name} scriptCommand={script.command} />}
      />
    );

    const runTerminalAction = (
      <Action
        key="terminal"
        title={`Run in ${terminal}`}
        icon={Icon.Terminal}
        onAction={() => launchInTerminal(script)}
      />
    );

    return (
      <List.Item
        key={script.name}
        icon={{ source: cat.icon, tintColor: cat.color }}
        title={script.name}
        subtitle={script.command}
        keywords={[script.command, script.category]}
        accessories={[
          ...(script.isLongRunning
            ? [{ tag: { value: "interactive", color: Color.Green }, tooltip: "Recommended to run in Terminal" }]
            : []),
          { tag: { value: cat.label, color: cat.color } },
        ]}
        actions={
          <ActionPanel>
            <ActionPanel.Section title="Execute Script">
              {script.isLongRunning ? (
                <>
                  {runTerminalAction}
                  {runInlineAction}
                </>
              ) : (
                <>
                  {runInlineAction}
                  {runTerminalAction}
                </>
              )}
              <Action.Push
                title="Run with Extra Arguments…"
                icon={Icon.TextInput}
                shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                target={<RunScriptArgsForm project={project} script={script} />}
              />
            </ActionPanel.Section>

            <ActionPanel.Section title="Copy & Open">
              <Action.CopyToClipboard
                title={`Copy "${cmd.display}"`}
                content={cmd.display}
                shortcut={Keyboard.Shortcut.Common.Copy}
              />
              <Action.CopyToClipboard title="Copy Raw Script Command" content={script.command} />
              <Action.Open title="Open Package.json" target={project.packageJsonPath} />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      navigationTitle={isNested ? `Scripts — ${project.name}` : undefined}
      searchBarPlaceholder={`Search scripts in ${project.name} (${PACKAGE_MANAGER_META[project.packageManager].label})...`}
      searchBarAccessory={searchBarAccessory}
    >
      {project.scripts.length === 0 ? (
        <List.EmptyView
          icon={Icon.Terminal}
          title="No Scripts Defined"
          description={`${project.name}'s package.json has no "scripts" entries.`}
          actions={
            <ActionPanel>
              <Action.Open title="Open Package.json" target={project.packageJsonPath} />
            </ActionPanel>
          }
        />
      ) : (
        <>
          {recentScripts.length > 0 && (
            <List.Section title="Recently Run" subtitle={project.name}>
              {recentScripts.map(renderScriptItem)}
            </List.Section>
          )}
          <List.Section
            title={recentScripts.length > 0 ? "All Scripts" : `${project.name} Scripts`}
            subtitle={`${project.scripts.length} scripts · ${PACKAGE_MANAGER_META[project.packageManager].label}`}
          >
            {otherScripts.map(renderScriptItem)}
          </List.Section>
        </>
      )}
    </List>
  );
}
