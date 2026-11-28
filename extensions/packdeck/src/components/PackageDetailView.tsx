import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Detail,
  getPreferenceValues,
  Icon,
  showToast,
  Toast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { LocalProject, NpmPackageDetail, PackageManagerName } from "../types";
import { formatBytes, formatDuration, formatNumber, formatRelativeTime } from "../lib/format";
import { notifyOperationResult } from "../lib/notifications";
import { buildInstallCommand, executeInstall } from "../lib/package-manager";
import { fetchPackageDetail } from "../lib/registry";
import { getFavorites, toggleFavorite } from "../lib/storage";
import { InstallPackageForm } from "./InstallPackageForm";

interface PackageDetailViewProps {
  packageName: string;
  activeProject?: LocalProject;
  onMutated?: () => unknown;
}

function buildVersionsMarkdown(detail: NpmPackageDetail): string {
  const lines: string[] = [`# ${detail.name} — Versions & Changelog`, ""];

  if (detail.releasesUrl || detail.changelogUrl) {
    const links: string[] = [];
    if (detail.releasesUrl) links.push(`[GitHub Releases](${detail.releasesUrl})`);
    if (detail.changelogUrl) links.push(`[CHANGELOG.md](${detail.changelogUrl})`);
    lines.push(`> ${links.join(" · ")}`, "");
  }

  const distTagsEntries = Object.entries(detail.distTags);
  if (distTagsEntries.length > 0) {
    lines.push("## Distribution Tags", "", "| Tag | Version |", "| --- | --- |");
    for (const [tag, ver] of distTagsEntries) {
      lines.push(`| \`${tag}\` | \`${ver}\` |`);
    }
    lines.push("");
  }

  lines.push("## Recent Releases", "", "| Version | Tag | Published | Status |", "| --- | --- | --- | --- |");
  for (const v of detail.versions.slice(0, 35)) {
    const tag = v.distTag ? `\`${v.distTag}\`` : "—";
    const pub = v.publishedAt ? formatRelativeTime(v.publishedAt) : "—";
    const status = v.deprecated ? `Deprecated` : "Active";
    lines.push(`| \`${v.version}\` | ${tag} | ${pub} | ${status} |`);
  }

  return lines.join("\n");
}

function buildReadmeMarkdown(detail: NpmPackageDetail): string {
  const headerParts: string[] = [];
  if (detail.deprecated) {
    headerParts.push(`> **Deprecated:** ${detail.deprecated}\n`);
  }
  if (detail.readme?.trim()) {
    headerParts.push(detail.readme);
  } else {
    headerParts.push(`# ${detail.name}\n\n${detail.description || "_No README available for this package._"}`);
  }
  return headerParts.join("\n\n");
}

export function PackageDetailView({ packageName, activeProject, onMutated }: PackageDetailViewProps) {
  const prefs = getPreferenceValues<Preferences>();
  const [viewMode, setViewMode] = useState<"readme" | "versions">("readme");

  const {
    data: detail,
    isLoading,
    error,
  } = usePromise(async (name: string) => fetchPackageDetail(name, prefs.registryUrl), [packageName]);

  const { data: favorites, revalidate: revalidateFavs } = usePromise(getFavorites);
  const isFav = useMemo(() => (favorites ?? []).some((f) => f.name === packageName), [favorites, packageName]);

  const markdown = useMemo(() => {
    if (error) {
      return `# Failed to load \`${packageName}\`\n\n${error.message}`;
    }
    if (!detail) {
      return `# ${packageName}\n\nLoading package metadata from npm registry...`;
    }
    return viewMode === "readme" ? buildReadmeMarkdown(detail) : buildVersionsMarkdown(detail);
  }, [detail, error, packageName, viewMode]);

  const defaultPm: PackageManagerName =
    activeProject?.packageManager ??
    (prefs.defaultPackageManager && prefs.defaultPackageManager !== "auto"
      ? (prefs.defaultPackageManager as PackageManagerName)
      : "npm");

  async function quickInstall(depType: "prod" | "dev", isGlobal = false) {
    if (!isGlobal && !activeProject) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No active project selected",
        message: "Use Install Package... to choose a project or install globally.",
      });
      return;
    }

    const pm = isGlobal ? defaultPm : activeProject!.packageManager;
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Installing ${packageName}...`,
      message: isGlobal ? `Global (${pm})` : `${activeProject!.name} (${pm})`,
    });

    const outcome = await executeInstall({
      pm,
      packageName,
      projectPath: isGlobal ? undefined : activeProject?.path,
      projectName: isGlobal ? undefined : activeProject?.name,
      isGlobal,
      depType,
      additionalPath: prefs.additionalPath,
    });

    await toast.hide();
    await notifyOperationResult({
      title: outcome.success ? `Installed ${packageName}` : `Install failed for ${packageName}`,
      message: outcome.success ? `${outcome.command} · ${formatDuration(outcome.durationMs)}` : outcome.errorMessage,
      success: outcome.success,
      durationMs: outcome.durationMs,
    });

    if (outcome.success) {
      await onMutated?.();
    }
  }

  async function handleToggleFavorite() {
    if (isFav) {
      const ok = await confirmAlert({
        title: `Remove "${packageName}" from Favorites?`,
        message: "You can add it back anytime from package search or details.",
        primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
      });
      if (!ok) return;
    }

    const res = await toggleFavorite({
      name: packageName,
      description: detail?.description ?? "",
      version: detail?.latestVersion ?? "",
      links: {
        npm: detail?.npmUrl,
        homepage: detail?.homepage,
        repository: detail?.repositoryUrl,
        bugs: detail?.bugsUrl,
      },
    });
    await revalidateFavs();
    await showToast({
      style: Toast.Style.Success,
      title: res.isFavorite ? `Added ${packageName} to Favorites` : `Removed ${packageName} from Favorites`,
    });
  }

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={`${packageName}${detail ? ` v${detail.latestVersion}` : ""}`}
      markdown={markdown}
      metadata={
        detail ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Version" text={detail.latestVersion} icon={Icon.Tag} />
            <Detail.Metadata.Label
              title="Weekly Downloads"
              text={detail.weeklyDownloads !== undefined ? formatNumber(detail.weeklyDownloads) : "—"}
              icon={Icon.Download}
            />
            {detail.monthlyDownloads !== undefined && (
              <Detail.Metadata.Label title="Monthly Downloads" text={formatNumber(detail.monthlyDownloads)} />
            )}
            <Detail.Metadata.Label title="License" text={detail.license} />
            <Detail.Metadata.Label
              title="TypeScript Types"
              text={detail.hasTypes ? "Built-in" : "Not bundled"}
              icon={{
                source: detail.hasTypes ? Icon.CheckCircle : Icon.MinusCircle,
                tintColor: detail.hasTypes ? Color.Blue : Color.SecondaryText,
              }}
            />
            {detail.unpackedSize !== undefined && (
              <Detail.Metadata.Label
                title="Unpacked Size"
                text={`${formatBytes(detail.unpackedSize)}${detail.fileCount ? ` (${detail.fileCount} files)` : ""}`}
              />
            )}
            <Detail.Metadata.Label
              title="Dependencies"
              text={`${Object.keys(detail.dependencies).length} prod · ${Object.keys(detail.peerDependencies).length} peer`}
            />
            <Detail.Metadata.Label title="Last Published" text={formatRelativeTime(detail.lastPublished)} />
            {detail.author && <Detail.Metadata.Label title="Author" text={detail.author} />}
            {detail.maintainers.length > 0 && (
              <Detail.Metadata.Label
                title="Maintainers"
                text={detail.maintainers
                  .slice(0, 4)
                  .map((m) => m.name || m.username || m.email)
                  .filter(Boolean)
                  .join(", ")}
              />
            )}
            <Detail.Metadata.Separator />
            <Detail.Metadata.Link title="npm" target={detail.npmUrl} text="npmjs.com" />
            {detail.repositoryUrl && (
              <Detail.Metadata.Link title="Repository" target={detail.repositoryUrl} text="GitHub / Source" />
            )}
            {detail.homepage && <Detail.Metadata.Link title="Homepage" target={detail.homepage} text="Documentation" />}
            {detail.releasesUrl && (
              <Detail.Metadata.Link title="Releases" target={detail.releasesUrl} text="View Releases" />
            )}
            {detail.changelogUrl && (
              <Detail.Metadata.Link title="Changelog" target={detail.changelogUrl} text="CHANGELOG.md" />
            )}
            <Detail.Metadata.Link
              title="Bundle Size"
              target={`https://bundlephobia.com/package/${encodeURIComponent(detail.name)}`}
              text="Bundlephobia"
            />
            <Detail.Metadata.Link
              title="Supply Chain"
              target={`https://socket.dev/npm/package/${encodeURIComponent(detail.name)}`}
              text="Socket.dev"
            />
            {detail.keywords.length > 0 && (
              <>
                <Detail.Metadata.Separator />
                <Detail.Metadata.TagList title="Keywords">
                  {detail.keywords.slice(0, 8).map((kw) => (
                    <Detail.Metadata.TagList.Item key={kw} text={kw} />
                  ))}
                </Detail.Metadata.TagList>
              </>
            )}
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Install">
            <Action.Push
              title="Install Package…"
              icon={Icon.Download}
              target={
                <InstallPackageForm packageName={packageName} defaultProject={activeProject} onSuccess={onMutated} />
              }
            />
            {activeProject && (
              <>
                <Action
                  title={`Quick Install to ${activeProject.name}`}
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "i" }}
                  onAction={() => quickInstall("prod", false)}
                />
                <Action
                  title={`Install as Dev Dependency in ${activeProject.name}`}
                  icon={Icon.Hammer}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
                  onAction={() => quickInstall("dev", false)}
                />
              </>
            )}
            <Action
              title={`Install Globally (${defaultPm})`}
              icon={Icon.Globe}
              shortcut={{ modifiers: ["cmd", "opt"], key: "i" }}
              onAction={() => quickInstall("prod", true)}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="View & Bookmark">
            <Action
              title={viewMode === "readme" ? "Show Versions & Changelog" : "Show README"}
              icon={viewMode === "readme" ? Icon.List : Icon.Document}
              shortcut={{ modifiers: ["cmd"], key: "t" }}
              onAction={() => setViewMode((m) => (m === "readme" ? "versions" : "readme"))}
            />
            <Action
              title={isFav ? "Remove from Favorites" : "Add to Favorites"}
              icon={isFav ? Icon.StarDisabled : Icon.Star}
              style={isFav ? Action.Style.Destructive : Action.Style.Regular}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
              onAction={handleToggleFavorite}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Copy Install Command">
            <Action.CopyToClipboard
              title={`Copy ${buildInstallCommand("npm", packageName).display}`}
              content={buildInstallCommand("npm", packageName).display}
            />
            <Action.CopyToClipboard
              title={`Copy ${buildInstallCommand("pnpm", packageName).display}`}
              content={buildInstallCommand("pnpm", packageName).display}
            />
            <Action.CopyToClipboard
              title={`Copy ${buildInstallCommand("yarn", packageName).display}`}
              content={buildInstallCommand("yarn", packageName).display}
            />
            <Action.CopyToClipboard
              title={`Copy ${buildInstallCommand("bun", packageName).display}`}
              content={buildInstallCommand("bun", packageName).display}
            />
          </ActionPanel.Section>

          {detail && (
            <ActionPanel.Section title="Links">
              <Action.OpenInBrowser title="Open on npm" url={detail.npmUrl} />
              {detail.repositoryUrl && <Action.OpenInBrowser title="Open Repository" url={detail.repositoryUrl} />}
              {detail.homepage && <Action.OpenInBrowser title="Open Homepage" url={detail.homepage} />}
              {detail.releasesUrl && <Action.OpenInBrowser title="Open Releases" url={detail.releasesUrl} />}
              {detail.changelogUrl && <Action.OpenInBrowser title="Open Changelog" url={detail.changelogUrl} />}
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    />
  );
}
