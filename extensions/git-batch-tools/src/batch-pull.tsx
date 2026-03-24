import { ActionPanel, Action, Icon, List, Toast, showToast, getPreferenceValues, useNavigation } from "@raycast/api";
import { useState, useEffect, useCallback, useRef } from "react";
import { Repo, RepoStatus, ProjectGroup } from "./shared/types";
import { getProjectGroups, scanRepos, pullRepo, parallelPull } from "./shared/git";
import { useRepoCounts } from "./shared/hooks";
import { getStatusIcon, getStatusTag } from "./shared/ui";
import { EditorActions, OpenInTerminal, CopyBranchName } from "./shared/actions";

function PullProgress({ group }: { group: ProjectGroup }) {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPulling, setIsPulling] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const prefsRef = useRef(getPreferenceValues<Preferences>());
  const maxParallel = Math.max(1, parseInt(prefsRef.current.maxParallelProcesses) || 10);

  const updateRepo = useCallback((index: number, status: RepoStatus, error?: string) => {
    setRepos((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], status, error };
      return next;
    });
  }, []);

  const startPull = useCallback(
    async (repoList: Repo[]) => {
      setIsPulling(true);
      try {
        const targets = repoList.map((r, i) => ({ ...r, index: i }));
        let done = 0;
        const total = targets.length;
        setProgress({ done: 0, total });

        const results = new Map<number, { status: RepoStatus; error?: string }>();
        targets.forEach((r) => updateRepo(r.index, "pulling"));

        const toast = await showToast({
          style: Toast.Style.Animated,
          title: `Pulling ${group.name}...`,
          message: `0/${total}`,
        });

        await parallelPull(targets, maxParallel, (index, status, error) => {
          updateRepo(index, status, error);
          results.set(index, { status, error });
          done++;
          setProgress({ done, total });
          toast.message = `${done}/${total}`;
        });

        const updated = Array.from(results.values()).filter((r) => r.status === "updated").length;
        const failed = Array.from(results.values()).filter((r) => r.status === "error").length;
        const dirty = Array.from(results.values()).filter((r) => r.status === "dirty").length;

        toast.style = failed > 0 ? Toast.Style.Failure : Toast.Style.Success;
        toast.title = `Done: ${updated} updated, ${failed} failed, ${dirty} skipped`;
        toast.message = undefined;
      } catch (error) {
        showToast({ style: Toast.Style.Failure, title: "Batch pull failed", message: String(error) });
      } finally {
        setIsPulling(false);
      }
    },
    [group.name, maxParallel, updateRepo],
  );

  const hasStarted = useRef(false);
  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    async function load() {
      try {
        const scanned = await scanRepos(group.path);
        setRepos(scanned);
        setIsLoading(false);
        await startPull(scanned);
      } catch (error) {
        setIsLoading(false);
        showToast({ style: Toast.Style.Failure, title: "Failed to scan repos", message: String(error) });
      }
    }
    load();
  }, []);

  const pullSingle = useCallback(
    async (index: number) => {
      if (isPulling) return;
      setIsPulling(true);
      try {
        updateRepo(index, "pulling");
        const result = await pullRepo(repos[index].path);
        updateRepo(index, result.status, result.error);
      } finally {
        setIsPulling(false);
      }
    },
    [repos, isPulling, updateRepo],
  );

  const retryAll = useCallback(async () => {
    if (isPulling) return;
    await startPull(repos);
  }, [repos, isPulling, startPull]);

  const isDone = !isLoading && !isPulling;
  const sectionOrder: RepoStatus[] = ["error", "dirty", "updated", "up-to-date", "pulling", "idle"];
  const sectionTitles: Record<string, string> = {
    error: "Failed",
    dirty: "Uncommitted Changes",
    updated: "Updated",
    "up-to-date": "Up to Date",
    pulling: "Pulling",
    idle: "Ready",
  };

  const repoItem = (repo: Repo, index: number) => (
    <List.Item
      key={repo.path}
      icon={getStatusIcon(repo.status)}
      title={repo.name}
      subtitle={repo.status === "error" && repo.error ? repo.error : repo.branch}
      accessories={[{ tag: getStatusTag(repo.status) }]}
      actions={
        <ActionPanel>
          <Action title="Pull" icon={Icon.Download} onAction={() => pullSingle(index)} />
          <Action title="Pull All Again" icon={Icon.RotateClockwise} onAction={retryAll} />
          <ActionPanel.Section title="Open">
            <EditorActions repoPath={repo.path} />
            <OpenInTerminal repoPath={repo.path} />
            <CopyBranchName branch={repo.branch} />
            <Action.ShowInFinder path={repo.path} />
            <Action.OpenWith path={repo.path} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );

  const summary = isDone
    ? sectionOrder
        .filter((status) => repos.some((r) => r.status === status))
        .map((status) => `${repos.filter((r) => r.status === status).length} ${sectionTitles[status].toLowerCase()}`)
        .join(", ")
    : "";

  let navTitle = group.name;
  if (isPulling) navTitle = `${group.name} — ${progress.done}/${progress.total}`;
  else if (summary) navTitle = `${group.name} — ${summary}`;

  return (
    <List isLoading={isLoading || isPulling} navigationTitle={navTitle}>
      {isDone
        ? sectionOrder
            .filter((status) => repos.some((r) => r.status === status))
            .map((status) => (
              <List.Section
                key={status}
                title={sectionTitles[status]}
                subtitle={`${repos.filter((r) => r.status === status).length}`}
              >
                {repos.map((repo, index) => (repo.status === status ? repoItem(repo, index) : null))}
              </List.Section>
            ))
        : repos.map((repo, index) => repoItem(repo, index))}
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
              <Action title="Pull All" icon={Icon.Download} onAction={() => push(<PullProgress group={group} />)} />
              <Action.ShowInFinder path={group.path} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
