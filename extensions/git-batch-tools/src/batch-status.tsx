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
import { getProjectGroups, scanRepos, isDirty, getAheadBehind, pullRepo } from "./shared/git";
import { useRepoCounts } from "./shared/hooks";
import { EditorActions, OpenInTerminal, CopyBranchName } from "./shared/actions";

type StatusCategory = "dirty" | "diverged" | "ahead" | "behind" | "no-upstream" | "clean";

interface StatusRepo {
  name: string;
  path: string;
  branch: string;
  dirty: boolean;
  ahead: number;
  behind: number;
  noUpstream: boolean;
  category: StatusCategory;
}

function categorize(dirty: boolean, ahead: number, behind: number, noUpstream: boolean): StatusCategory {
  if (dirty) return "dirty";
  if (ahead > 0 && behind > 0) return "diverged";
  if (ahead > 0) return "ahead";
  if (behind > 0) return "behind";
  if (noUpstream) return "no-upstream";
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
    case "no-upstream":
      return { source: Icon.QuestionMarkCircle, tintColor: Color.SecondaryText };
    case "clean":
      return { source: Icon.CheckCircle, tintColor: Color.Green };
  }
}

function StatusList({ group }: { group: ProjectGroup }) {
  const [repos, setRepos] = useState<StatusRepo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPulling, setIsPulling] = useState(false);
  const hasStarted = useRef(false);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    async function load() {
      try {
        const scanned = await scanRepos(group.path);
        const prefs = getPreferenceValues<Preferences>();
        const maxParallel = Math.max(1, parseInt(prefs.maxParallelProcesses) || 10);

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
                noUpstream: abResult.noUpstream,
                category: categorize(dirtyResult, abResult.ahead, abResult.behind, abResult.noUpstream),
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
      if (isPulling) return;
      setIsPulling(true);
      const repo = repos[index];
      try {
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
            noUpstream: abResult.noUpstream,
            category: categorize(dirtyResult, abResult.ahead, abResult.behind, abResult.noUpstream),
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
      } catch (error) {
        showToast({ style: Toast.Style.Failure, title: "Pull failed", message: String(error) });
      } finally {
        setIsPulling(false);
      }
    },
    [repos, isPulling],
  );

  const sectionOrder: StatusCategory[] = ["dirty", "diverged", "ahead", "behind", "no-upstream", "clean"];
  const sectionTitles: Record<StatusCategory, string> = {
    dirty: "Dirty",
    diverged: "Diverged",
    ahead: "Ahead",
    behind: "Behind",
    "no-upstream": "No Upstream",
    clean: "Clean",
  };

  const repoItem = (repo: StatusRepo, index: number) => {
    const accessories: List.Item.Accessory[] = [];
    if (repo.dirty) accessories.push({ tag: { value: "dirty", color: Color.Yellow } });
    if (repo.ahead > 0) accessories.push({ tag: { value: `↑${repo.ahead}`, color: Color.Blue } });
    if (repo.behind > 0) accessories.push({ tag: { value: `↓${repo.behind}`, color: Color.Purple } });
    if (repo.noUpstream) {
      accessories.push({ tag: { value: "no upstream", color: Color.SecondaryText } });
    } else if (!repo.dirty && repo.ahead === 0 && repo.behind === 0) {
      accessories.push({ tag: { value: "clean", color: Color.Green } });
    }

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

  const summary = !isLoading
    ? sectionOrder
        .filter((cat) => repos.some((r) => r.category === cat))
        .map((cat) => `${repos.filter((r) => r.category === cat).length} ${sectionTitles[cat].toLowerCase()}`)
        .join(", ")
    : "";

  return (
    <List isLoading={isLoading || isPulling} navigationTitle={summary ? `${group.name} — ${summary}` : group.name}>
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
  const repoCounts = useRepoCounts(groups);

  return (
    <List>
      {groups.map((group) => (
        <List.Item
          key={group.path}
          icon={Icon.Folder}
          title={group.name}
          accessories={[{ text: repoCounts[group.path] != null ? `${repoCounts[group.path]} repos` : undefined }]}
          actions={
            <ActionPanel>
              <Action title="View Status" icon={Icon.Eye} onAction={() => push(<StatusList group={group} />)} />
              <Action.ShowInFinder path={group.path} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
