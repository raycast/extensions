import { Detail, Icon, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";

import {
  getSkillByPath,
  getApiUrl,
  getSnapshotTreeEntries,
  listSnapshotsBySkill,
  readSnapshotFileContent,
} from "./api";
import type { AuthCredential, Skill, Snapshot, SnapshotFileContent, SnapshotTreeEntry } from "./api";
import { getErrorMessage } from "./api-error";
import {
  buildSkillDetailMarkdown,
  formatBytes,
  formatDate,
  normalizeSkillTags,
  parseSkillMarkdownDocument,
  stripDirectoryPath,
} from "./detail-format";
import { buildSkillViewPath, recordSkillViewMetric } from "./metrics";
import { SkillActions } from "./skill-actions";

interface Props {
  credential?: AuthCredential | null;
  skill: Skill;
}

interface DetailState {
  fileContent: SnapshotFileContent | null;
  skill: Skill;
  snapshot: Snapshot | null;
  treeEntries: SnapshotTreeEntry[];
}

const formatNumber = (value?: number) =>
  value === undefined ? undefined : Intl.NumberFormat("en", { notation: "compact" }).format(value);

const resolveCurrentSnapshot = (snapshots: Snapshot[], latestSnapshotId?: string) =>
  snapshots.find((snapshot) => snapshot.id === latestSnapshotId) ?? snapshots[0] ?? null;

const metadataTagColor = "#B7B7BA";

const auditTextForSkill = (skill: Skill) => {
  if (skill.staticAudit) {
    return `${skill.staticAudit.status} · ${skill.staticAudit.riskLevel}`;
  }

  if (skill.latestAuditScore !== undefined) {
    return `${skill.latestAuditScore}/100`;
  }
};

const snapshotSizeText = (skill: Skill, fileContent: SnapshotFileContent | null) => {
  if (fileContent?.totalBytes !== undefined) {
    return { title: "File Size", text: formatBytes(fileContent.totalBytes) };
  }

  if (skill.latestSnapshotTotalBytes !== undefined) {
    return { title: "Snapshot Size", text: formatBytes(skill.latestSnapshotTotalBytes) };
  }

  return null;
};

function AuthorMetadata({ skill }: { skill: Skill }) {
  const authorText = skill.author?.name ?? skill.authorHandle;
  const authorIcon = skill.author?.avatarUrl ? { source: skill.author.avatarUrl } : Icon.PersonCircle;

  return authorText ? <Detail.Metadata.Label icon={authorIcon} title="Author" text={authorText} /> : null;
}

function IdentityMetadata({ fileContent, skill }: Pick<DetailState, "fileContent" | "skill">) {
  const frontmatter = parseSkillMarkdownDocument(fileContent?.content ?? "").frontmatter;
  const description = frontmatter?.description ?? skill.description;

  return (
    <>
      <AuthorMetadata skill={skill} />
      {frontmatter?.name ? <Detail.Metadata.Label title="Name" text={frontmatter.name} /> : null}
      {description ? <Detail.Metadata.Label title="Description" text={description} /> : null}
      {skill.repoUrl ? (
        <Detail.Metadata.Link title="GitHub" target={skill.repoUrl} text={skill.repoName ?? "Repository"} />
      ) : null}
      {skill.license ? <Detail.Metadata.Label title="License" text={skill.license} /> : null}
    </>
  );
}

function TagsMetadata({ skill }: { skill: Skill }) {
  const displayTags = normalizeSkillTags({
    primaryCategory: skill.primaryCategory,
    tags: skill.tags,
  });

  return displayTags.length ? (
    <Detail.Metadata.TagList title="Tags">
      {displayTags.map((tag) => (
        <Detail.Metadata.TagList.Item key={tag} color={metadataTagColor} text={tag} />
      ))}
    </Detail.Metadata.TagList>
  ) : null;
}

function CatalogMetadata({ fileContent, skill, snapshot }: Pick<DetailState, "fileContent" | "skill" | "snapshot">) {
  const metadata = parseSkillMarkdownDocument(fileContent?.content ?? "").frontmatter?.metadata;
  const version = metadata?.version ?? snapshot?.version ?? skill.latestVersion;

  return (
    <>
      {skill.primaryCategory ? <Detail.Metadata.Label title="Category" text={skill.primaryCategory} /> : null}
      {version ? <Detail.Metadata.Label title="Version" text={version} /> : null}
      <TagsMetadata skill={skill} />
    </>
  );
}

function MetricsMetadata({ skill }: { skill: Skill }) {
  const auditText = auditTextForSkill(skill);

  return (
    <>
      {auditText ? <Detail.Metadata.Label title="Audit" text={auditText} /> : null}
      {skill.staticAudit?.summary ? (
        <Detail.Metadata.Label title="Audit Summary" text={skill.staticAudit.summary} />
      ) : null}
      {skill.isVerified ? <Detail.Metadata.Label title="Verified" text="Yes" /> : null}
      <NumberMetadata title="Stars" value={skill.stargazerCount} />
      <NumberMetadata title="Downloads" value={skill.downloadsAllTime} />
      <NumberMetadata title="Forks" value={skill.forkCount} />
      <NumberMetadata title="Views" value={skill.viewsAllTime} />
    </>
  );
}

function FilesMetadata({ fileContent, skill, snapshot, treeEntries }: DetailState) {
  const size = snapshotSizeText(skill, fileContent);
  const visibleEntries = treeEntries
    .map((entry) => stripDirectoryPath(entry.path, snapshot?.directoryPath))
    .toSorted((a, b) => a.localeCompare(b))
    .slice(0, 10);
  const hiddenCount = Math.max(0, treeEntries.length - visibleEntries.length);

  return (
    <>
      {snapshot?.entryPath ? <Detail.Metadata.Label title="Entry" text={snapshot.entryPath} /> : null}
      {size ? <Detail.Metadata.Label title={size.title} text={size.text} /> : null}
      {treeEntries.length ? (
        <Detail.Metadata.Label
          title="Files"
          text={`${treeEntries.length} file${treeEntries.length === 1 ? "" : "s"}`}
        />
      ) : null}
      {visibleEntries.map((path) => (
        <Detail.Metadata.Label key={path} title="-" text={path} />
      ))}
      {hiddenCount ? <Detail.Metadata.Label title="More Files" text={`${hiddenCount} more`} /> : null}
    </>
  );
}

function NumberMetadata({ title, value }: { title: string; value?: number }) {
  return value === undefined ? null : <Detail.Metadata.Label title={title} text={formatNumber(value)} />;
}

function DatesMetadata({ skill, snapshot }: Pick<DetailState, "skill" | "snapshot">) {
  return (
    <>
      {skill.createdAt ? <Detail.Metadata.Label title="Created" text={formatDate(skill.createdAt)} /> : null}
      {skill.updatedAt ? <Detail.Metadata.Label title="Updated" text={formatDate(skill.updatedAt)} /> : null}
      {snapshot?.sourceCommitDate ? (
        <Detail.Metadata.Label title="Snapshot" text={formatDate(snapshot.sourceCommitDate)} />
      ) : null}
      {snapshot?.sourceCommitSha ? (
        <Detail.Metadata.Label title="Commit" text={snapshot.sourceCommitSha.slice(0, 7)} />
      ) : null}
      {snapshot?.sourceCommitUrl ? (
        <Detail.Metadata.Link title="Commit URL" target={snapshot.sourceCommitUrl} text="Open Commit" />
      ) : null}
    </>
  );
}

function SkillMetadata(state: DetailState) {
  const { skill } = state;

  return (
    <Detail.Metadata>
      <IdentityMetadata fileContent={state.fileContent} skill={skill} />
      <Detail.Metadata.Separator />
      <CatalogMetadata fileContent={state.fileContent} skill={skill} snapshot={state.snapshot} />
      <Detail.Metadata.Separator />
      <MetricsMetadata skill={skill} />
      <Detail.Metadata.Separator />
      <FilesMetadata {...state} />
      <Detail.Metadata.Separator />
      <DatesMetadata skill={skill} snapshot={state.snapshot} />
    </Detail.Metadata>
  );
}

export function SkillDetail({ credential, skill: initialSkill }: Props) {
  const [state, setState] = useState<DetailState>({
    fileContent: null,
    skill: initialSkill,
    snapshot: null,
    treeEntries: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        const fullSkill =
          initialSkill.authorHandle && initialSkill.repoName
            ? ((await getSkillByPath(initialSkill)) ?? initialSkill)
            : initialSkill;
        const snapshots = await listSnapshotsBySkill({ limit: 3, skillId: fullSkill.id });
        const snapshot = resolveCurrentSnapshot(snapshots.page, fullSkill.latestSnapshotId);
        const [fileContent, treeEntries] = snapshot
          ? await Promise.all([
              readSnapshotFileContent({
                path: snapshot.entryPath,
                snapshotId: snapshot.id,
              }),
              getSnapshotTreeEntries(snapshot.id),
            ])
          : [null, []];

        if (!cancelled) {
          setState({ fileContent, skill: fullSkill, snapshot, treeEntries });
          await recordSkillViewMetric({
            apiUrl: getApiUrl(),
            path: buildSkillViewPath(fullSkill),
            skillId: fullSkill.id,
          }).catch(() => null);
        }
      } catch (error) {
        if (!cancelled) {
          await showToast({
            message: getErrorMessage(error),
            style: Toast.Style.Failure,
            title: "Could not load skill detail",
          });
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [initialSkill]);

  const { fileContent, skill, snapshot, treeEntries } = state;
  const markdown = buildSkillDetailMarkdown({
    content: fileContent?.content ?? "",
    description: skill.description,
    directoryPath: snapshot?.directoryPath,
    entries: treeEntries,
    isTruncated: fileContent?.isTruncated ?? false,
    title: skill.title,
  });

  return (
    <Detail
      actions={<SkillActions credential={credential} showReviewAction skill={skill} />}
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={skill.title}
      metadata={<SkillMetadata {...state} />}
    />
  );
}
