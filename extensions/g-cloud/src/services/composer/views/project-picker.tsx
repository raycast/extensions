// Project picker shared by every Composer view (same project list and recents as the hub dropdown).

import { hotkey } from "../lib/shortcut";
import { Action, ActionPanel, Color, Icon, List, useNavigation } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getProjects } from "../../../gcloud";
import { CacheManager, Project } from "../../../utils/CacheManager";
import { resolveGcloudPath, setCurrentProject, useCurrentProject } from "../lib/raycast";

export function ProjectPicker() {
  const { pop } = useNavigation();
  const current = useCurrentProject();
  const { data, isLoading } = useCachedPromise(
    async (): Promise<Project[]> => {
      const projects = await getProjects(await resolveGcloudPath());
      CacheManager.saveProjectsList(projects);
      return projects;
    },
    [],
    { initialData: CacheManager.getProjectsList()?.projects, keepPreviousData: true },
  );
  const recentIds = CacheManager.getRecentlyUsedProjects();
  const all = data ?? [];
  const recent = recentIds.map((id) => all.find((p) => p.id === id)).filter((p): p is Project => !!p);
  const others = all
    .filter((p) => !recentIds.includes(p.id))
    .sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id));

  const item = (p: Project) => (
    <List.Item
      key={p.id}
      icon={{ source: Icon.Folder, tintColor: p.id === current ? Color.Green : Color.SecondaryText }}
      title={p.name || p.id}
      subtitle={p.name && p.name !== p.id ? p.id : undefined}
      keywords={[p.id]}
      accessories={p.id === current ? [{ tag: { value: "current", color: Color.Green } }] : []}
      actions={
        <ActionPanel>
          <Action
            title="Switch to Project"
            icon={Icon.Switch}
            onAction={() => {
              setCurrentProject(p.id);
              pop();
            }}
          />
          <Action.CopyToClipboard title="Copy Project ID" content={p.id} />
        </ActionPanel>
      }
    />
  );

  return (
    <List isLoading={isLoading} navigationTitle="Switch Project" searchBarPlaceholder="Search projects by name or id…">
      {recent.length > 0 && <List.Section title="Recent Projects">{recent.map(item)}</List.Section>}
      <List.Section title="All Projects" subtitle={`${others.length}`}>
        {others.map(item)}
      </List.Section>
    </List>
  );
}

export function SwitchProjectAction() {
  const current = useCurrentProject();
  return (
    <Action.Push
      title={current ? `Switch Project (${current})…` : "Switch Project…"}
      icon={Icon.Switch}
      shortcut={hotkey(["cmd", "shift"], "o")}
      target={<ProjectPicker />}
    />
  );
}
