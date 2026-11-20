import { Action, ActionPanel, Form, Icon, Keyboard, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import {
  addExternalBounceFile,
  getProjectMetadata,
  removeExcludedSharedBounce,
  setBounceAliases,
} from "@/core/metadata/project-metadata";
import {
  bounceMatchesTitle,
  checkBounceAlias,
  getSharedBounceAliases,
  getSharedBounceExclusions,
  getSharedBounceTitles,
  guessAliasFromFileName,
  setSharedBounceAliases,
  setSharedBounceExclusions,
  unmatchedSharedBounces,
  type Bounce,
} from "@/core/projects/bounces";
import type { Project } from "@/core/projects/types";
import { showFailure } from "@/core/ui/toast";
import { projectIcon } from "@/daws/icons";
import { getTranslations } from "@/i18n";
import { getSettings } from "@/settings";

const settings = getSettings();
const t = getTranslations(settings.language);

export type Assignment = { file: string } | { alias: string };

// 共享 Bounces 文件夹里没对上任何项目的 bounce：逐个指给项目，或加一个别名让同开头的都归它。
export function UnmatchedBounces({ projects, onChanged }: { projects: Project[]; onChanged: () => void }) {
  // 手动登记过的外部文件也算已配对。指定后在这里直接更新，不用等上层重新加载。
  const [claimed, setClaimed] = useState(() => projects.flatMap((project) => project.externalBounceFiles));
  const [bounces, setBounces] = useState<Bounce[]>(() => unmatchedSharedBounces(claimed));
  const sortedProjects = [...projects].sort((a, b) => a.title.localeCompare(b.title));

  function handleAssigned(projectTitle: string, assignment: Assignment) {
    let nextClaimed = claimed;
    if ("file" in assignment) {
      nextClaimed = [...claimed, assignment.file];
    } else {
      const aliases = getSharedBounceAliases();
      setSharedBounceAliases({ ...aliases, [projectTitle]: [...(aliases[projectTitle] ?? []), assignment.alias] });
    }
    setClaimed(nextClaimed);
    setBounces(unmatchedSharedBounces(nextClaimed));
    onChanged();
  }

  return (
    <List navigationTitle={t.unmatchedBounces} searchBarPlaceholder={t.searchUnmatchedBounces}>
      <List.EmptyView icon="bounce.png" title={t.noUnmatchedBounces} description={t.noUnmatchedBouncesHint} />
      {bounces.map((bounce) => (
        <List.Item
          key={bounce.path}
          icon="bounce.png"
          title={bounce.name}
          quickLook={{ path: bounce.path, name: bounce.name }}
          accessories={[{ date: new Date(bounce.modifiedAt) }]}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.Push
                  title={t.assignToProject}
                  icon={Icon.Link}
                  target={<AssignBounce bounce={bounce} projects={sortedProjects} onAssigned={handleAssigned} />}
                />
                <Action.ToggleQuickLook shortcut={{ modifiers: ["cmd"], key: "y" }} />
                <Action.ShowInFinder
                  path={bounce.path}
                  title={t.showInFinder}
                  shortcut={{ modifiers: ["cmd", "opt"], key: "o" }}
                />
              </ActionPanel.Section>
              <ActionPanel.Section title={t.sectionCopy}>
                <Action.CopyToClipboard
                  content={bounce.path}
                  title={t.copyBouncePath}
                  icon={Icon.CopyClipboard}
                  shortcut={Keyboard.Shortcut.Common.CopyPath}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export function AssignBounce({
  bounce,
  projects,
  onAssigned,
}: {
  bounce: Bounce;
  projects: Project[];
  onAssigned: (projectTitle: string, assignment: Assignment) => void;
}) {
  const { pop } = useNavigation();
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [mode, setMode] = useState<"alias" | "file">("alias");
  const [alias, setAlias] = useState(() => guessAliasFromFileName(bounce.name));
  const [aliasError, setAliasError] = useState<string | undefined>();

  function validateAlias(value: string, id: string): string | undefined {
    const project = projects.find((p) => p.id === id);
    if (!project) return undefined;
    const problem = checkBounceAlias(value, project.title, getSharedBounceTitles(), getSharedBounceAliases());
    if (problem === "empty") return t.aliasEmpty;
    if (problem) return t.aliasTaken.replace("{project}", problem.taken);
    // 别名要能认出这个文件，否则加了它这个文件还是没归属。
    if (!bounceMatchesTitle(bounce.name, value.trim())) return t.aliasNotMatchingFile;
    return undefined;
  }

  // 之前标过「不属于这个项目」的，现在又指回来：撤销标记，否则它还是不会归这个项目。
  async function clearExclusion(project: Project) {
    await removeExcludedSharedBounce(project.id, bounce.name);
    const exclusions = getSharedBounceExclusions();
    const rest = (exclusions[project.title] ?? []).filter((name) => name !== bounce.name);
    setSharedBounceExclusions({ ...exclusions, [project.title]: rest });
  }

  async function handleSubmit() {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;
    try {
      if (mode === "file") {
        await addExternalBounceFile(project.id, bounce.path);
        await clearExclusion(project);
        await showToast({ style: Toast.Style.Success, title: t.bounceAssigned, message: project.title });
        onAssigned(project.title, { file: bounce.path });
      } else {
        const error = validateAlias(alias, project.id);
        if (error) {
          setAliasError(error);
          return;
        }
        const value = alias.trim();
        const current = (await getProjectMetadata(project.id)).bounceAliases;
        await setBounceAliases(project.id, [...current, value]);
        await clearExclusion(project);
        await showToast({
          style: Toast.Style.Success,
          title: t.bounceAliasAdded,
          message: `${value} → ${project.title}`,
        });
        onAssigned(project.title, { alias: value });
      }
      pop();
    } catch (error) {
      await showFailure(t.assignBounceFailed, error);
    }
  }

  return (
    <Form
      navigationTitle={`${t.assignToProject} — ${bounce.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={t.assignToProject} icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={bounce.name} />
      <Form.Dropdown
        id="project"
        title={t.assignProjectField}
        value={projectId}
        onChange={(id) => {
          setProjectId(id);
          if (mode === "alias" && aliasError) setAliasError(validateAlias(alias, id));
        }}
      >
        {projects.map((project) => (
          <Form.Dropdown.Item
            key={project.id}
            value={project.id}
            title={project.title}
            icon={projectIcon(project.kind)}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="mode"
        title={t.assignMatchField}
        value={mode}
        onChange={(value) => setMode(value === "file" ? "file" : "alias")}
      >
        <Form.Dropdown.Item value="alias" title={t.assignByAlias} />
        <Form.Dropdown.Item value="file" title={t.assignThisFileOnly} />
      </Form.Dropdown>
      {mode === "alias" && (
        <Form.TextField
          id="alias"
          title={t.aliasField}
          info={t.aliasFieldInfo}
          value={alias}
          error={aliasError}
          onChange={(value) => {
            setAlias(value);
            if (aliasError) setAliasError(validateAlias(value, projectId));
          }}
          onBlur={() => setAliasError(validateAlias(alias, projectId))}
        />
      )}
    </Form>
  );
}
