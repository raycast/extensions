import {
  ActionPanel,
  Action,
  List,
  Icon,
  Color,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  Form,
  Clipboard,
  useNavigation,
  open,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import path from "path";
import crypto from "crypto";
import {
  getWorkItemStates,
  getWorkItemChildren,
  getWorkItemAttachments,
  getWorkItemComments,
  updateWorkItemState,
  getWebUrl,
  getAllRepositories,
  getBranches,
  createBranchForWorkItem,
  Repository,
  WorkItem,
} from "../lib/azure-devops";
import {
  processDescription,
  fetchAttachmentByName,
  isImageFilename,
  toMarkdownFileUrl,
  ProcessedDescription,
  ProcessedImage,
} from "../lib/attachments";
import { readAppSettings } from "../lib/app-settings";

export function useProcessedDescription(description: string | undefined): ProcessedDescription | null {
  const [media, setMedia] = useState<ProcessedDescription | null>(null);
  useEffect(() => {
    let cancelled = false;
    setMedia(null);
    processDescription(description).then((m) => {
      if (!cancelled) setMedia(m);
    });
    return () => {
      cancelled = true;
    };
  }, [description]);
  return media;
}

export function useProcessedHtmlList(htmls: (string | undefined)[], key: string): ProcessedDescription | null {
  const [media, setMedia] = useState<ProcessedDescription | null>(null);
  useEffect(() => {
    let cancelled = false;
    setMedia(null);
    const combined = htmls.filter(Boolean).join("\n\n");
    processDescription(combined).then((m) => {
      if (!cancelled) setMedia(m);
    });
    return () => {
      cancelled = true;
    };
  }, [key]);
  return media;
}

export const TYPE_ICONS: Record<string, { icon: Icon; tintColor: Color }> = {
  Bug: { icon: Icon.Bug, tintColor: Color.Red },
  Task: { icon: Icon.Checkmark, tintColor: Color.Yellow },
  "User Story": { icon: Icon.Bookmark, tintColor: Color.Blue },
  Feature: { icon: Icon.Star, tintColor: Color.Purple },
  Epic: { icon: Icon.Trophy, tintColor: Color.Orange },
  Issue: { icon: Icon.ExclamationMark, tintColor: Color.Red },
};

export const STATE_COLORS: Record<string, Color> = {
  New: Color.Blue,
  Active: Color.Green,
  Doing: Color.Green,
  "In Progress": Color.Green,
  Resolved: Color.Purple,
  "Code Review": Color.Purple,
  Testing: Color.Yellow,
  Closed: Color.SecondaryText,
  Done: Color.SecondaryText,
  Removed: Color.SecondaryText,
};

export function getTypeAccessory(type: string) {
  return TYPE_ICONS[type] ?? { icon: Icon.Document, tintColor: Color.PrimaryText };
}

export function getStateColor(state: string): Color {
  return STATE_COLORS[state] ?? Color.PrimaryText;
}

export function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "oe")
    .replace(/å/g, "aa")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getBranchName(item: WorkItem): string {
  const prefix = `${item.id}-`;
  const maxSlug = Math.max(20, 80 - prefix.length);
  return (prefix + slugify(item.title).slice(0, maxSlug)).replace(/-+$/, "");
}

export function WorkItemView({ item, onUpdated }: { item: WorkItem; onUpdated?: (updated: WorkItem) => void }) {
  const [current, setCurrent] = useState<WorkItem>(item);

  const { data: comments } = useCachedPromise(getWorkItemComments, [current.project, current.id], {
    initialData: [] as string[],
    keepPreviousData: false,
  });

  const richHtmls = [current.description, current.acceptanceCriteria, current.reproSteps, ...(comments ?? [])];
  const richKey = `${current.id}|${crypto.createHash("sha1").update(richHtmls.filter(Boolean).join("\u0000")).digest("hex")}`;
  const media = useProcessedHtmlList(richHtmls, richKey);

  const {
    data: children,
    isLoading,
    mutate: mutateChildren,
  } = useCachedPromise(getWorkItemChildren, [current.id], {
    initialData: [] as WorkItem[],
    keepPreviousData: false,
  });

  const { data: rawAttachments, isLoading: loadingAttachments } = useCachedPromise(
    getWorkItemAttachments,
    [current.id],
    {
      initialData: [],
      keepPreviousData: false,
      onError: (err) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load attachments",
          message: err.message,
        });
      },
    },
  );

  const [fileAttachments, setFileAttachments] = useState<ProcessedImage[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const rawAttachmentsKey = (rawAttachments ?? []).map((a) => a.url).join("|");
  useEffect(() => {
    let cancelled = false;
    const list = rawAttachments ?? [];
    if (list.length === 0) {
      setFileAttachments((prev) => (prev.length === 0 ? prev : []));
      setLoadingFiles(false);
      return;
    }
    setLoadingFiles(true);
    Promise.all(
      list.map(async (a) => {
        try {
          return await fetchAttachmentByName(a.url, a.name);
        } catch {
          return null;
        }
      }),
    ).then((results) => {
      if (cancelled) return;
      const ok = results.filter((r): r is ProcessedImage => r !== null);
      setFileAttachments(ok);
      setLoadingFiles(false);
    });
    return () => {
      cancelled = true;
    };
  }, [rawAttachmentsKey]);

  const childList = children ?? [];
  const typeAcc = getTypeAccessory(current.workItemType);

  const inlineImages = media?.images ?? [];
  const inlineUrls = new Set(inlineImages.map((i) => i.originalUrl));
  const extraAttachments = fileAttachments.filter((a) => !inlineUrls.has(a.originalUrl));
  const images = [...inlineImages, ...extraAttachments];
  const attachmentsLoading = loadingAttachments || loadingFiles;

  const handleSelfUpdated = (updated: WorkItem) => {
    setCurrent(updated);
    onUpdated?.(updated);
  };

  const handleChildUpdated = (updated: WorkItem) => {
    const next = childList.map((c) => (c.id === updated.id ? updated : c));
    mutateChildren(Promise.resolve(next), {
      optimisticUpdate: () => next,
    });
  };

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      navigationTitle={`#${current.id} · ${current.workItemType}`}
      searchBarPlaceholder="Search children…"
    >
      <List.Section title="Item">
        <List.Item
          icon={{ source: typeAcc.icon, tintColor: typeAcc.tintColor }}
          title={current.title}
          subtitle={`#${current.id}`}
          accessories={[
            {
              tag: {
                value: current.state,
                color: getStateColor(current.state),
              },
            },
          ]}
          detail={<WorkItemDetail item={current} withChildren={false} media={media} />}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.Push
                  title="Change State"
                  icon={Icon.Pencil}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                  target={<ChangeStateView item={current} onUpdated={handleSelfUpdated} />}
                />
                <Action.OpenInBrowser
                  title="Open in Azure Devops"
                  url={getWebUrl(current)}
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                />
                {images.length > 0 && (
                  <Action
                    title="Open First Attachment"
                    icon={Icon.Image}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
                    onAction={() => open(images[0].localPath)}
                  />
                )}
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action.Push
                  title="Create Branch"
                  icon={Icon.NewDocument}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
                  target={<CreateBranchForm item={current} />}
                />
                <Action.CopyToClipboard
                  title="Copy Branch Name"
                  icon={Icon.CodeBlock}
                  content={getBranchName(current)}
                  shortcut={{ modifiers: ["cmd", "opt"], key: "b" }}
                />
                <Action.CopyToClipboard
                  title="Copy Title"
                  content={current.title}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
                />
                <Action.CopyToClipboard
                  title="Copy URL"
                  content={getWebUrl(current)}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
                />
                <Action.CopyToClipboard
                  title="Copy as Markdown Link"
                  content={`[#${current.id} ${current.title}](${getWebUrl(current)})`}
                  shortcut={{ modifiers: ["cmd", "opt"], key: "." }}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Attachments" subtitle={attachmentsLoading ? "loading…" : String(images.length)}>
        {images.length === 0 && !attachmentsLoading && (
          <List.Item
            icon={Icon.Minus}
            title="No attachments"
            subtitle="No images in description, acceptance criteria, repro steps, comments, or attached files"
          />
        )}
        {images.length === 0 && attachmentsLoading && (
          <List.Item icon={Icon.CircleProgress} title="Loading attachments…" />
        )}
        {images.map((img, i) => {
          const isImg = isImageFilename(img.filename || img.localPath);
          const ext = path.extname(img.localPath).slice(1).toUpperCase();
          const detailMarkdown = isImg
            ? `![${img.alt || img.filename}](${toMarkdownFileUrl(img.localPath)})`
            : `### ${img.filename}\n\nNot an image — open in default app to view.`;
          return (
            <List.Item
              key={img.localPath}
              icon={{
                source: isImg ? Icon.Image : Icon.Document,
                tintColor: isImg ? Color.Blue : Color.SecondaryText,
              }}
              title={img.filename || `Attachment ${i + 1}`}
              subtitle={img.alt && img.alt !== img.filename ? img.alt : undefined}
              accessories={[{ text: ext }]}
              detail={<List.Item.Detail markdown={detailMarkdown} />}
              actions={
                <ActionPanel>
                  <Action title="Open" icon={Icon.Eye} onAction={() => open(img.localPath)} />
                  {img.originalUrl.startsWith("http") && (
                    <Action.OpenInBrowser
                      title="Open Source URL"
                      url={img.originalUrl}
                      shortcut={{ modifiers: ["cmd"], key: "o" }}
                    />
                  )}
                  <Action.ShowInFinder
                    title={process.platform === "win32" ? "Show in Explorer" : "Show in Finder"}
                    path={img.localPath}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                  />
                  <Action.CopyToClipboard title="Copy File Path" content={img.localPath} />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>

      {childList.length > 0 && (
        <List.Section title="Children" subtitle={String(childList.length)}>
          {childList.map((c) => {
            const cTypeAcc = getTypeAccessory(c.workItemType);
            return (
              <List.Item
                key={c.id}
                icon={{ source: cTypeAcc.icon, tintColor: cTypeAcc.tintColor }}
                title={c.title}
                subtitle={`#${c.id}`}
                keywords={[String(c.id), c.workItemType, ...c.tags]}
                accessories={[{ tag: { value: c.state, color: getStateColor(c.state) } }]}
                detail={<WorkItemDetail item={c} withChildren={false} />}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      <Action.Push
                        title="Open"
                        icon={Icon.ArrowRight}
                        target={<WorkItemView item={c} onUpdated={handleChildUpdated} />}
                      />
                      <Action.Push
                        title="Change State"
                        icon={Icon.Pencil}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                        target={<ChangeStateView item={c} onUpdated={handleChildUpdated} />}
                      />
                      <Action.OpenInBrowser
                        title="Open in Azure Devops"
                        url={getWebUrl(c)}
                        shortcut={{ modifiers: ["cmd"], key: "o" }}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section>
                      <Action.Push
                        title="Create Branch"
                        icon={Icon.NewDocument}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
                        target={<CreateBranchForm item={c} />}
                      />
                      <Action.CopyToClipboard
                        title="Copy Branch Name"
                        icon={Icon.CodeBlock}
                        content={getBranchName(c)}
                        shortcut={{ modifiers: ["cmd", "opt"], key: "b" }}
                      />
                      <Action.CopyToClipboard
                        title="Copy Title"
                        content={c.title}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
                      />
                      <Action.CopyToClipboard
                        title="Copy URL"
                        content={getWebUrl(c)}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}

      {!isLoading && childList.length === 0 && (
        <List.Section title="Children">
          <List.Item icon={Icon.Minus} title="No children" />
        </List.Section>
      )}
    </List>
  );
}

export function WorkItemDetail({
  item,
  withChildren = true,
  media: providedMedia,
}: {
  item: WorkItem;
  withChildren?: boolean;
  media?: ProcessedDescription | null;
}) {
  const ownMedia = useProcessedDescription(providedMedia === undefined ? item.description : undefined);
  const media = providedMedia ?? ownMedia;

  const { data: children, isLoading: childrenLoading } = useCachedPromise(getWorkItemChildren, [item.id], {
    initialData: [] as WorkItem[],
    keepPreviousData: false,
    execute: withChildren,
  });

  const childrenList = children ?? [];
  const childrenSection = !withChildren
    ? ""
    : childrenLoading
      ? "\n\n## Children\n\n_Loading…_"
      : childrenList.length === 0
        ? ""
        : `\n\n## Children (${childrenList.length})\n\n${childrenList
            .map((c) => {
              const done = ["Closed", "Done", "Removed"].includes(c.state);
              const box = done ? "[x]" : "[ ]";
              return `- ${box} **#${c.id}** [${c.title}](${getWebUrl(c)}) — *${c.workItemType} · ${c.state}*`;
            })
            .join("\n")}`;

  const meta = [
    `**${item.workItemType} #${item.id}**`,
    `· ${item.state}`,
    item.priority ? `· P${item.priority}` : "",
    `· ${item.project}`,
    `· ${formatRelative(item.changedDate)}`,
  ]
    .filter(Boolean)
    .join(" ");

  const tagsLine = item.tags.length > 0 ? `\n\n_Tags: ${item.tags.join(", ")}_` : "";

  const descriptionMd = media?.markdown ?? (item.description ? stripHtml(item.description) : "_No description_");

  const md = `
# ${item.title}

${meta}${tagsLine}

---

${descriptionMd}${childrenSection}
  `.trim();

  return <List.Item.Detail markdown={md} />;
}

export function CreateBranchForm({ item }: { item: WorkItem }) {
  const { pop } = useNavigation();
  const { data: repos, isLoading } = useCachedPromise(getAllRepositories, [], {
    initialData: [] as Repository[],
    onError: (err) => {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load repositories",
        message: err.message,
      });
    },
  });

  const repoList = repos ?? [];
  const [repoId, setRepoId] = useState<string>("");
  const [branchName, setBranchName] = useState<string>(getBranchName(item));
  const [baseBranch, setBaseBranch] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [repoUserPicked, setRepoUserPicked] = useState(false);
  const [baseUserPicked, setBaseUserPicked] = useState(false);

  const [defaultRepoSetting, setDefaultRepoSetting] = useState<string>("");
  const [defaultBaseBranchSetting, setDefaultBaseBranchSetting] = useState<string>("");

  useEffect(() => {
    readAppSettings().then(({ settings }) => {
      setDefaultRepoSetting(settings.defaultRepo);
      setDefaultBaseBranchSetting(settings.defaultBaseBranch);
    });
  }, []);

  useEffect(() => {
    if (repoUserPicked) return;
    if (repoList.length === 0) return;

    const wanted = defaultRepoSetting.trim();
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
    const wantedNorm = wanted ? norm(wanted) : "";

    const byPref = wantedNorm
      ? repoList.find((r) => norm(r.name) === wantedNorm) ?? repoList.find((r) => norm(r.name).includes(wantedNorm))
      : undefined;
    const byProject = repoList.find((r) => r.projectName === item.project && norm(r.name) === norm(item.project));
    const projectFirst = repoList.find((r) => r.projectName === item.project);
    const preferred = byPref ?? byProject ?? projectFirst ?? repoList[0];

    if (preferred.id !== repoId) {
      setRepoId(preferred.id);
    }

    if (wanted && !byPref) {
      const sample = repoList
        .slice(0, 8)
        .map((r) => `${r.projectName}/${r.name}`)
        .join(", ");
      const more = repoList.length > 8 ? ` … (+${repoList.length - 8} more)` : "";
      showToast({
        style: Toast.Style.Failure,
        title: `Default repo "${wanted}" not found among ${repoList.length}`,
        message: `${sample}${more}`,
      });
    }
  }, [repoList, repoUserPicked, item.project, defaultRepoSetting]);

  const handleRepoChange = (id: string) => {
    if (id === repoId) return;
    if (id === "") return;
    setRepoId(id);
    setRepoUserPicked(true);
    setBaseUserPicked(false);
  };

  const handleBaseBranchChange = (b: string) => {
    if (b === baseBranch) return;
    if (b === "") return;
    setBaseBranch(b);
    setBaseUserPicked(true);
  };

  const repo = repoList.find((r) => r.id === repoId);
  const repoDefault = repo?.defaultBranch.replace(/^refs\/heads\//, "");

  const { data: branches, isLoading: loadingBranches } = useCachedPromise(
    async (project: string, id: string) => {
      if (!id || !project) return [];
      return getBranches(project, id);
    },
    [repo?.projectName ?? "", repoId],
    { initialData: [] as string[], keepPreviousData: false },
  );

  const branchList = branches ?? [];

  const safeBaseBranch = branchList.includes(baseBranch) ? baseBranch : "";
  const safeRepoId = repoList.some((r) => r.id === repoId) ? repoId : "";

  useEffect(() => {
    if (baseUserPicked) return;
    if (branchList.length === 0) return;
    const exists = (name: string) => branchList.find((b) => b.toLowerCase() === name.toLowerCase());

    const candidates = [
      defaultBaseBranchSetting.trim(),
      "development",
      "develop",
      "dev",
      repoDefault,
      "main",
      "master",
    ].filter((s): s is string => !!s && s.length > 0);

    let next: string | undefined;
    for (const c of candidates) {
      const found = exists(c);
      if (found) {
        next = found;
        break;
      }
    }
    next = next ?? branchList[0];

    if (next && next !== baseBranch) {
      setBaseBranch(next);
    }
  }, [branchList.join("|"), baseUserPicked, defaultBaseBranchSetting]);

  const handleSubmit = async () => {
    if (!repo) {
      showToast({ style: Toast.Style.Failure, title: "Pick a repository" });
      return;
    }
    const trimmed = branchName.trim();
    if (!trimmed) {
      showToast({ style: Toast.Style.Failure, title: "Branch name required" });
      return;
    }
    if (!baseBranch) {
      showToast({ style: Toast.Style.Failure, title: "Pick a base branch" });
      return;
    }

    setSubmitting(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Creating ${trimmed} from ${baseBranch}…`,
    });

    try {
      const { branchName: created, branchUrl } = await createBranchForWorkItem({
        workItemId: item.id,
        repo,
        branchName: trimmed,
        baseBranch,
      });
      await Clipboard.copy(created);
      toast.style = Toast.Style.Success;
      toast.title = `Created ${created}`;
      toast.message = `From ${baseBranch} · copied to clipboard`;
      toast.primaryAction = {
        title: "Open Branch",
        onAction: () => open(branchUrl),
      };
      pop();
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to create branch";
      toast.message = err instanceof Error ? err.message : String(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Form
      isLoading={isLoading || loadingBranches || submitting}
      navigationTitle={`#${item.id} — Create Branch`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Branch" icon={Icon.NewDocument} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={`Branch will be created from "${baseBranch || "…"}" and linked to #${item.id}.`} />
      <Form.Dropdown id="repo" title="Repository" value={safeRepoId} onChange={handleRepoChange}>
        <Form.Dropdown.Item value="" title={repoList.length === 0 ? "Loading repos…" : "—"} />
        {repoList.map((r) => (
          <Form.Dropdown.Item key={r.id} value={r.id} title={`${r.name}  ·  ${r.projectName}`} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="baseBranch" title="Base Branch" value={safeBaseBranch} onChange={handleBaseBranchChange}>
        <Form.Dropdown.Item value="" title={branchList.length === 0 ? "Loading branches…" : "—"} />
        {branchList.map((b) => (
          <Form.Dropdown.Item key={b} value={b} title={b === repoDefault ? `${b}  (default)` : b} />
        ))}
      </Form.Dropdown>
      <Form.TextField id="branchName" title="Branch Name" value={branchName} onChange={setBranchName} />
    </Form>
  );
}

export function ChangeStateView({ item, onUpdated }: { item: WorkItem; onUpdated: (updated: WorkItem) => void }) {
  const [currentState, setCurrentState] = useState(item.state);

  const { data: states, isLoading } = useCachedPromise(
    (project: string, type: string) => getWorkItemStates(project, type),
    [item.project, item.workItemType],
    {
      initialData: [],
      onError: (err) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load states",
          message: err.message,
        });
      },
    },
  );

  const handleChange = async (newState: string) => {
    if (newState === currentState) return;

    if (newState === "Closed" || newState === "Removed" || newState === "Done") {
      const confirmed = await confirmAlert({
        title: `Move #${item.id} to ${newState}?`,
        message: item.title,
        primaryAction: {
          title: newState,
          style: Alert.ActionStyle.Destructive,
        },
      });
      if (!confirmed) return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Updating to ${newState}…`,
    });

    try {
      const updated = await updateWorkItemState(item.id, newState);
      setCurrentState(updated.state);
      onUpdated(updated);
      toast.style = Toast.Style.Success;
      toast.title = `#${item.id} → ${newState}`;
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Update failed";
      toast.message = err instanceof Error ? err.message : String(err);
    }
  };

  return (
    <List isLoading={isLoading} navigationTitle={`#${item.id} — Change State`} searchBarPlaceholder="Choose new state…">
      {(states ?? []).map((state) => (
        <List.Item
          key={state}
          icon={{
            source: state === currentState ? Icon.CheckCircle : Icon.Circle,
            tintColor: getStateColor(state),
          }}
          title={state}
          subtitle={state === currentState ? "Current" : undefined}
          actions={
            <ActionPanel>
              <Action title={`Set to ${state}`} icon={Icon.Checkmark} onAction={() => handleChange(state)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .trim();
}
