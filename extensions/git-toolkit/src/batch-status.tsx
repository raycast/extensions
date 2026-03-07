import {
  ActionPanel,
  Action,
  Icon,
  List,
  Color,
  Toast,
  showToast,
  getPreferenceValues,
  useNavigation,
} from "@raycast/api";
import { useState, useEffect, useRef, useCallback } from "react";
import { ProjectGroup } from "./shared/types";
import { getProjectGroups, countRepos, scanRepos, isDirty, getAheadBehind, pullRepo } from "./shared/git";
import { EditorActions, OpenInTerminal, CopyBranchName } from "./shared/actions";

type StatusCategory = "dirty" | "diverged" | "ahead" | "behind" | "clean";

interface StatusRepo {
  name: string;
  path: string;
  branch: string;
  dirty: boolean;
  ahead: number;
  behind: number;
  category: StatusCategory;
}

function categorize(dirty: boolean, ahead: number, behind: number): StatusCategory {
  if (dirty) return "dirty";
  if (ahead > 0 && behind > 0) return "diverged";
  if (ahead > 0) return "ahead";
  if (behind > 0) return "behind";
  return "clean";
}

function getStatusIcon(category: StatusCategory) {
  switch (category) {
    case "dirty":
      return { source: Icon.Warning, tintColor: Color.Yellow };
    case "diverged":
      return { source: Icon.ArrowsContract, tintColor: Color.Orange };
    case "ahead":
      return { source: Icon.ArrowUp, tintColor: Color.Blue };
    case "behind":
      return { source: Icon.ArrowDown, tintColor: Color.Purple };
    case "clean":
      return { source: Icon.CheckCircle, tintColor: Color.Green };
  }
}

function StatusList({ group }: { group: ProjectGroup }) {
  const [repos, setRepos] = useState<StatusRepo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const hasStarted = useRef(false);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    async function load() {
      try {
        const scanned = await scanRepos(group.path);
        const prefs = getPreferenceValues<Preferences>();
        const maxParallel = parseInt(prefs.maxParallelProcesses) || 10;

        const results: StatusRepo[] = [];
        for (let i = 0; i < scanned.length; i += maxParallel) {
          const batch = scanned.slice(i, i + maxParallel);
          const batchResults = await Promise.all(
            batch.map(async (repo) => {
              const [dirtyResult, abResult] = await Promise.all([isDirty(repo.path), getAheadBehind(repo.path)]);
              return {
                name: repo.name,
                path: repo.path,
                branch: repo.branch,
                dirty: dirtyResult,
                ahead: abResult.ahead,
                behind: abResult.behind,
                category: categorize(dirtyResult, abResult.ahead, abResult.behind),
              } as StatusRepo;
            }),
          );
          results.push(...batchResults);
        }

        setRepos(results);
      } catch (error) {
        showToast({ style: Toast.Style.Failure, title: "Failed to scan repos", message: String(error) });
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, []);

  const pullSingle = useCallback(
    async (index: number) => {
      const repo = repos[index];
      const toast = await showToast({ style: Toast.Style.Animated, title: `Pulling ${repo.name}...` });
      const result = await pullRepo(repo.path);

      // Re-scan this repo's status after pull
      const [dirtyResult, abResult] = await Promise.all([isDirty(repo.path), getAheadBehind(repo.path)]);
      setRepos((prev) => {
        const next = [...prev];
        next[index] = {
          ...next[index],
          dirty: dirtyResult,
          ahead: abResult.ahead,
          behind: abResult.behind,
          category: categorize(dirtyResult, abResult.ahead, abResult.behind),
        };
        return next;
      });

      if (result.status === "error") {
        toast.style = Toast.Style.Failure;
        toast.title = `Failed to pull ${repo.name}`;
        toast.message = result.error;
      } else if (result.status === "dirty") {
        toast.style = Toast.Style.Failure;
        toast.title = `${repo.name} has uncommitted changes`;
      } else if (result.status === "updated") {
        toast.style = Toast.Style.Success;
        toast.title = `${repo.name} updated`;
      } else {
        toast.style = Toast.Style.Success;
        toast.title = `${repo.name} already up to date`;
      }
    },
    [repos],
  );

  const sectionOrder: StatusCategory[] = ["dirty", "diverged", "ahead", "behind", "clean"];
  const sectionTitles: Record<StatusCategory, string> = {
    dirty: "Dirty",
    diverged: "Diverged",
    ahead: "Ahead",
    behind: "Behind",
    clean: "Clean",
  };

  const repoItem = (repo: StatusRepo, index: number) => {
    const accessories: List.Item.Accessory[] = [];
    if (repo.dirty) accessories.push({ tag: { value: "dirty", color: Color.Yellow } });
    if (repo.ahead > 0) accessories.push({ tag: { value: `↑${repo.ahead}`, color: Color.Blue } });
    if (repo.behind > 0) accessories.push({ tag: { value: `↓${repo.behind}`, color: Color.Purple } });
    if (!repo.dirty && repo.ahead === 0 && repo.behind === 0)
      accessories.push({ tag: { value: "clean", color: Color.Green } });

    return (
      <List.Item
        key={repo.path}
        icon={getStatusIcon(repo.category)}
        title={repo.name}
        subtitle={repo.branch}
        accessories={accessories}
        actions={
          <ActionPanel>
            <EditorActions repoPath={repo.path} />
            <Action title="Pull" icon={Icon.Download} onAction={() => pullSingle(index)} />
            <CopyBranchName branch={repo.branch} />
            <OpenInTerminal repoPath={repo.path} />
            <Action.ShowInFinder path={repo.path} />
          </ActionPanel>
        }
      />
    );
  };

  return (
    <List isLoading={isLoading} navigationTitle={group.name}>
      {!isLoading &&
        sectionOrder
          .filter((cat) => repos.some((r) => r.category === cat))
          .map((cat) => (
            <List.Section
              key={cat}
              title={sectionTitles[cat]}
              subtitle={`${repos.filter((r) => r.category === cat).length}`}
            >
              {repos.map((repo, index) => (repo.category === cat ? repoItem(repo, index) : null))}
            </List.Section>
          ))}
    </List>
  );
}

export default function Command() {
  const groups = getProjectGroups();
  const { push } = useNavigation();

  return (
    <List>
      {groups.map((group) => {
        const repoCount = countRepos(group.path);
        return (
          <List.Item
            key={group.path}
            icon={Icon.Folder}
            title={group.name}
            accessories={[{ text: `${repoCount} repos` }]}
            actions={
              <ActionPanel>
                <Action title="View Status" icon={Icon.Eye} onAction={() => push(<StatusList group={group} />)} />
                <Action.ShowInFinder path={group.path} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
