import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Detail,
  Form,
  Icon,
  List,
  LocalStorage,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { basename } from "node:path";
import { homedir } from "node:os";
import { markdownText } from "./model";
import {
  defaultWorktreeRoots,
  removeWorktree,
  reviewWorktree,
  scanWorktrees,
  Worktree,
  WorktreeReview,
  WorktreeScan,
} from "./worktree-data";

const rootsKey = "worktree-additional-roots";
const branchName = (tree: Worktree) =>
  tree.branch?.replace(/^refs\/heads\//, "") ??
  (tree.bare ? "Bare repository" : `Detached · ${tree.head.slice(0, 8)}`);
function dateLabel(tree: Worktree) {
  return tree.createdAt
    ? new Date(tree.createdAt).toLocaleString()
    : "Unavailable";
}

function ScanFolders({ done }: { done: () => void }) {
  const [folders, setFolders] = useState("");
  const { pop } = useNavigation();
  useEffect(() => {
    void LocalStorage.getItem<string>(rootsKey).then((v) =>
      setFolders(v ?? ""),
    );
  }, []);
  async function save() {
    const normalized = folders
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    if (
      normalized.some(
        (p) => !(p.startsWith("/") || p === "~" || p.startsWith("~/")),
      )
    ) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Use full folder paths, one per line",
      });
      return;
    }
    await LocalStorage.setItem(rootsKey, normalized.join("\n"));
    pop();
    done();
  }
  return (
    <Form
      navigationTitle="Worktree Scan Folders"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save and Rescan" onSubmit={save} />
        </ActionPanel>
      }
    >
      <Form.Description text="The default scan covers your home projects and known hidden provider folders. Git also reveals registered worktrees outside those folders. Add other locations or external drives below. Scans run only when you open this command or choose Rescan." />
      <Form.TextArea
        id="folders"
        title="Additional Folders"
        placeholder="/Volumes/Projects\n~/some-hidden-folder"
        value={folders}
        onChange={setFolders}
      />
      <Form.Description text="Dependencies, build outputs, caches, media folders, Library, and symbolic-link traversal are skipped during broad discovery. Add a skipped folder directly to include it. A scan stops after 45 seconds or 30,000 directories and reports incomplete coverage." />
    </Form>
  );
}

function DeleteForm({
  review,
  onDeleted,
}: {
  review: WorktreeReview;
  onDeleted: () => void;
}) {
  const [confirmation, setConfirmation] = useState(""),
    [busy, setBusy] = useState(false);
  const { pop } = useNavigation();
  async function remove() {
    if (busy) return;
    if (confirmation !== basename(review.tree.path)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Enter the exact worktree folder name",
      });
      return;
    }
    if (
      !(await confirmAlert({
        title: `Permanently delete ${basename(review.tree.path)} and its local changes?`,
        message: `${review.tree.path}\n\n${review.tracked} tracked changes, ${review.untracked} untracked paths, and ${review.ignored} ignored paths will be removed. The branch is kept. Close any agents or terminals using this folder first.`,
        primaryAction: {
          title: "Delete Including Local Changes",
          style: Alert.ActionStyle.Destructive,
        },
        dismissAction: { title: "Cancel" },
      }))
    )
      return;
    setBusy(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Removing selected worktree",
    });
    try {
      const result = await removeWorktree(review, true);
      toast.style = Toast.Style.Success;
      toast.title = "Worktree removed; branch kept";
      if (result.recoveryRef)
        toast.message = `Detached commit kept: ${result.recoveryRef}`;
      pop();
      pop();
      onDeleted();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Removal could not be confirmed";
      toast.message = String(error instanceof Error ? error.message : error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Form
      isLoading={busy}
      navigationTitle="Delete One Worktree"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Review Permanent Deletion"
            icon={Icon.Trash}
            onSubmit={remove}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title={basename(review.tree.path)}
        text={`${review.tree.path}\nBranch: ${branchName(review.tree)}\n\nThis permanently removes this checkout, including its local changes and ignored files. There is no Undo or Trash recovery for those files. Commits and the branch are retained; uncommitted files are not backed up.`}
      />
      <Form.TextField
        id="confirmation"
        title="Type Folder Name"
        placeholder={basename(review.tree.path)}
        value={confirmation}
        onChange={setConfirmation}
      />
    </Form>
  );
}

function WorktreeDetails({
  selected,
  onDeleted,
}: {
  selected: Worktree;
  onDeleted: () => void;
}) {
  const [review, setReview] = useState<WorktreeReview>(),
    [error, setError] = useState<string>(),
    [loading, setLoading] = useState(true),
    [removing, setRemoving] = useState(false);
  const { pop } = useNavigation();
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      setReview(await reviewWorktree(selected));
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
      setReview(undefined);
    } finally {
      setLoading(false);
    }
  }, [selected]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  async function removeClean() {
    if (!review || review.blockedReason || loading || removing) return;
    const confirmed = await confirmAlert({
      title: review.tree.exists
        ? `Delete worktree ${basename(review.tree.path)}?`
        : `Remove missing worktree registration ${basename(review.tree.path)}?`,
      message: `${review.tree.path}\nBranch: ${branchName(review.tree)}\n\n${review.ignored ? `${review.ignored} ignored paths will also be permanently deleted. ` : ""}${review.tree.exists ? "This removes the checkout from disk; it does not go to Trash. Close any agents or terminals using it first. " : "The checkout folder is already missing. "}The branch is kept. Detached commits get a recovery reference.`,
      primaryAction: {
        title: review.tree.exists
          ? "Delete This Worktree"
          : "Remove This Registration",
        style: Alert.ActionStyle.Destructive,
      },
      dismissAction: { title: "Cancel" },
    });
    if (!confirmed) return;
    setRemoving(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Removing selected worktree",
    });
    try {
      const result = await removeWorktree(review, false);
      toast.style = Toast.Style.Success;
      toast.title = "Worktree removed; branch kept";
      if (result.recoveryRef)
        toast.message = `Detached commit kept: ${result.recoveryRef}`;
      pop();
      onDeleted();
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Removal could not be confirmed";
      toast.message = String(e instanceof Error ? e.message : e);
      await refresh();
    } finally {
      setRemoving(false);
    }
  }
  const tree = review?.tree ?? selected;
  const dirty = !!review && (review.tracked > 0 || review.untracked > 0);
  const markdown =
    `# ${markdownText(basename(tree.path))}\n\n` +
    `| Worktree | Details |\n|---|---|\n| Repository | ${markdownText(tree.repository)} |\n| Branch | ${markdownText(branchName(tree))} |\n| Created (estimate) | ${dateLabel(tree)} |\n| Provider hint | ${markdownText(tree.provider)} |\n| Location | ${tree.main ? "Main checkout — protected" : tree.exists ? "Folder exists" : "Folder missing"} |\n\n` +
    `**Folder:** ${markdownText(tree.path)}\n\n**Commit:** ${tree.head || "Unborn branch"}\n\n${tree.createdSource}. Git does not reliably record an original creation date.\n\n${tree.providerEvidence}. Provider labels are hints; discovery uses Git and does not require a supported provider.\n\n` +
    (error ? `**Cannot review:** ${markdownText(error)}\n\n` : "") +
    (review
      ? `**Local changes:** ${review.tracked} tracked changes · ${review.untracked} untracked paths · ${review.ignored} ignored paths. Counts can represent whole directories.\n\n`
      : "Checking local changes…\n\n") +
    (review?.blockedReason
      ? `**Removal unavailable:** ${markdownText(review.blockedReason)}\n\n`
      : "") +
    (tree.prunable
      ? `Git's registration note: ${markdownText(tree.prunable)}\n\n`
      : "") +
    (review?.changes.length
      ? `### Changed and ignored paths\n\n${review.changes.map((s) => `- ${markdownText(s)}`).join("\n")}\n\nUp to 100 entries are shown.\n\n`
      : "") +
    "Deletion acts on this one checkout. Its branch stays in the repository. Detached commits are preserved under a recovery reference. Uncommitted and ignored files are not backed up. Stop any agent or terminal working in this folder before removing it; the inspector cannot prove a worktree is idle.";
  return (
    <Detail
      isLoading={loading || removing}
      markdown={markdown}
      actions={
        <ActionPanel>
          {tree.exists && <Action.ShowInFinder path={tree.path} />}
          <Action.CopyToClipboard
            title="Copy Worktree Path"
            content={tree.path}
          />
          <Action.CopyToClipboard
            title="Copy Branch"
            content={branchName(tree)}
          />
          <Action
            title="Refresh Review"
            icon={Icon.ArrowClockwise}
            onAction={refresh}
          />
          {!loading && !removing && review && !review.blockedReason && (
            <ActionPanel.Section title="Remove Only This Worktree">
              {dirty ? (
                <Action.Push
                  title="Delete Including Local Changes…"
                  icon={Icon.Trash}
                  target={<DeleteForm review={review} onDeleted={onDeleted} />}
                />
              ) : (
                <Action
                  title={
                    tree.exists
                      ? "Delete This Worktree…"
                      : "Remove Missing Registration…"
                  }
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={removeClean}
                />
              )}
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    />
  );
}

export default function Worktrees() {
  const [scan, setScan] = useState<WorktreeScan>(),
    [loading, setLoading] = useState(false),
    [error, setError] = useState<string>();
  const [filter, setFilter] = useState("existing"),
    [progress, setProgress] = useState("Discovering repositories…"),
    [limit, setLimit] = useState(200),
    [search, setSearch] = useState("");
  const controller = useRef<AbortController | undefined>(undefined);
  const runScan = useCallback(async () => {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setLoading(true);
    setError(undefined);
    setProgress("Discovering repositories…");
    try {
      const extra = ((await LocalStorage.getItem<string>(rootsKey)) ?? "")
        .split("\n")
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p) =>
          p === "~"
            ? homedir()
            : p.startsWith("~/")
              ? `${homedir()}/${p.slice(2)}`
              : p,
        );
      const result = await scanWorktrees(
        [...extra, ...defaultWorktreeRoots()],
        {
          signal: current.signal,
          onProgress: (dirs, repos) => {
            if (!current.signal.aborted)
              setProgress(
                `${dirs.toLocaleString()} folders · ${repos} repositories`,
              );
          },
        },
      );
      if (!current.signal.aborted) {
        setScan(result);
        setLimit(200);
      }
    } catch (e) {
      if (!current.signal.aborted)
        setError(String(e instanceof Error ? e.message : e));
    } finally {
      if (!current.signal.aborted) setLoading(false);
    }
  }, []);
  useEffect(() => {
    void runScan();
    return () => controller.current?.abort();
  }, [runScan]);
  const terms = search.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  const rows = (scan?.trees ?? [])
    .filter(
      (t) =>
        filter === "all" ||
        (filter === "existing" && !t.main && t.exists) ||
        (filter === "missing" && !t.exists) ||
        (filter === "main" && t.main),
    )
    .filter((t) =>
      terms.every((term) =>
        `${t.path} ${t.repository} ${t.provider} ${branchName(t)} ${t.head}`
          .toLocaleLowerCase()
          .includes(term),
      ),
    )
    .sort(
      (a, b) =>
        (b.createdAt ?? 0) - (a.createdAt ?? 0) || a.path.localeCompare(b.path),
    );
  const coverage = scan
    ? `${scan.trees.filter((t) => !t.main && t.exists).length} worktrees · ${scan.repositories} repositories · ${scan.partial ? "Scan limit reached" : "Scan finished"}`
    : "Worktree discovery";
  return (
    <List
      isLoading={loading}
      navigationTitle="Git Worktrees"
      searchBarPlaceholder="Search repository, branch, provider, or path"
      filtering={false}
      onSearchTextChange={(v) => {
        setSearch(v);
        setLimit(200);
      }}
      pagination={{
        pageSize: 200,
        hasMore: rows.length > limit,
        onLoadMore: () => setLimit((n) => n + 200),
      }}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Worktrees to Show"
          value={filter}
          onChange={(v) => {
            setFilter(v);
            setLimit(200);
          }}
        >
          <List.Dropdown.Item title="Existing Worktrees" value="existing" />
          <List.Dropdown.Item title="Missing Folders" value="missing" />
          <List.Dropdown.Item title="Main Checkouts" value="main" />
          <List.Dropdown.Item title="Everything" value="all" />
        </List.Dropdown>
      }
    >
      <List.Section title={loading ? progress : coverage}>
        <List.Item
          title="Scan Folders and Coverage"
          subtitle={
            error ??
            (scan?.warnings.length
              ? `${scan.warnings.length} locations could not be fully inspected`
              : "Git discovery across providers")
          }
          icon={Icon.MagnifyingGlass}
          actions={
            <ActionPanel>
              <Action
                title="Rescan Worktrees"
                icon={Icon.ArrowClockwise}
                onAction={runScan}
              />
              <Action.Push
                title="Add Scan Folders"
                icon={Icon.Folder}
                target={<ScanFolders done={runScan} />}
              />
              <Action.Push
                title="View Scan Coverage"
                icon={Icon.Info}
                target={
                  <Detail
                    markdown={`# Scan coverage\n\n${coverage}\n\n${scan?.partial ? "The scan hit its time or folder limit. Add a specific missing project folder and rescan; additional folders are searched first.\n\n" : ""}Roots:\n\n${(scan?.roots ?? defaultWorktreeRoots()).map((r) => `- ${markdownText(r)}`).join("\n")}\n\nGit registrations can reveal worktrees outside these roots. Unregistered folders and standalone clones are not linked worktrees. Symbolic links, dependencies, build outputs, and broad system/media folders are skipped. Missing default provider folders are normal.\n\n${(scan?.warnings ?? []).slice(0, 100).map(markdownText).join("\n\n")}`}
                  />
                }
              />
            </ActionPanel>
          }
        />
        {!loading && !rows.length && (
          <List.Item
            title="No matching worktrees found"
            subtitle="Try another filter or add a project folder"
            icon={Icon.Info}
          />
        )}
      </List.Section>
      <List.Section title="Newest first · creation dates are estimates · Enter opens a review">
        {rows.slice(0, limit).map((tree) => (
          <List.Item
            id={tree.key}
            key={tree.key}
            title={basename(tree.path)}
            subtitle={`${tree.repository} · ${branchName(tree)}`}
            keywords={[
              tree.path,
              tree.repository,
              tree.provider,
              tree.branch ?? "",
              tree.head,
            ]}
            icon={
              tree.main || tree.locked
                ? Icon.Lock
                : tree.exists
                  ? Icon.Code
                  : Icon.ExclamationMark
            }
            accessories={[
              { tag: { value: tree.provider, color: Color.SecondaryText } },
              ...(tree.createdAt
                ? [
                    {
                      date: new Date(tree.createdAt),
                      tooltip: `Created (estimate): ${dateLabel(tree)}`,
                    },
                  ]
                : [{ text: "Date unknown" }]),
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Review Worktree"
                  icon={Icon.Eye}
                  target={
                    <WorktreeDetails selected={tree} onDeleted={runScan} />
                  }
                />
                <Action
                  title="Rescan Worktrees"
                  icon={Icon.ArrowClockwise}
                  onAction={runScan}
                />
                <Action.Push
                  title="Add Scan Folders"
                  target={<ScanFolders done={runScan} />}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
