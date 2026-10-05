import { Color, Detail, Icon, open } from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";

import type { SearchResultDocument } from "@/types";

import { compatIcons } from "@/lib/compat";
import { jsrUrls } from "@/lib/jsrUrls";
import { formatBytes, formatRelative, scoreColor } from "@/lib/ui-helpers";

import {
  useDependencies,
  useDependents,
  useDownloads,
  usePackage,
  usePackages,
  useVersionMeta,
  useVersions,
} from "@/hooks/jsrApi";

import type { DepEntry } from "@/components/DepSection";
import DepSection from "@/components/DepSection";
import { useSearchContext } from "@/context/SearchContext";

const MAX_DEPS_SHOWN = 10;

const PackageMetadata = ({ item }: { item: SearchResultDocument }) => {
  const ctx = useSearchContext();
  const icons = compatIcons(item);
  const { data, isLoading } = usePackage(item);

  const { data: scopePackages } = usePackages(item.scope);
  const { data: versionsData, isLoading: versionsIsLoading } = useVersions(isLoading ? null : (data ?? null));
  const { data: downloadsData, isLoading: downloadsIsLoading } = useDownloads(isLoading ? null : (data ?? null));
  const { data: versionMeta, isLoading: versionMetaLoading } = useVersionMeta(
    item.scope,
    item.name,
    data?.latestVersion ?? null,
  );
  const { data: dependentsData } = useDependents(isLoading ? null : (data ?? null));
  const { data: dependenciesData } = useDependencies(isLoading ? null : (data ?? null), data?.latestVersion ?? null);

  const effectiveScore = data?.score ?? item.score ?? 0;
  const effectiveColor = scoreColor(effectiveScore);

  const latestPublishedAt = versionsData?.find((v) => v.version === data?.latestVersion)?.createdAt ?? null;
  const latestPublishedText = versionsIsLoading ? "Loading…" : formatRelative(latestPublishedAt);

  const totalDownloads = downloadsData?.total.reduce((sum, d) => sum + d.count, 0) ?? 0;
  const totalDownloadsText = downloadsIsLoading ? "Loading…" : totalDownloads.toLocaleString();

  const manifestEntries = versionMeta ? Object.values(versionMeta.manifest) : [];
  const totalBytes = manifestEntries.reduce((sum, e) => sum + (e.size ?? 0), 0);
  const fileCount = manifestEntries.length;
  const sizeText = versionMetaLoading
    ? "Loading…"
    : fileCount > 0
      ? `${formatBytes(totalBytes)} (${fileCount} files)`
      : "unknown";

  const entryPointCount = versionMeta ? Object.keys(versionMeta.exports).length : 0;
  const entryPointsText = versionMetaLoading ? "Loading…" : `${entryPointCount}`;

  const dependencyCount = data?.dependencyCount ?? dependenciesData?.length ?? 0;
  const dependentCount = data?.dependentCount ?? dependentsData?.total ?? 0;

  const dependencyEntries: DepEntry[] = (dependenciesData?.slice(0, MAX_DEPS_SHOWN) ?? []).map((dep) => {
    const text = `${dep.kind}:${dep.name}${dep.path ? `/${dep.path}` : ""}`;
    return {
      key: text,
      text,
      icon: dep.kind === "jsr" ? "jsr.svg" : dep.kind === "npm" ? "npm.svg" : undefined,
      onAction: () => {
        if (dep.kind === "jsr") open(jsrUrls.site.package(dep.name));
        else if (dep.kind === "npm") open(jsrUrls.site.npmPackage(dep.name));
      },
    };
  });

  const dependentEntries: DepEntry[] = (dependentsData?.items.slice(0, MAX_DEPS_SHOWN) ?? []).map((dep) => ({
    key: dep.key,
    text: `jsr:@${dep.scope}/${dep.package}`,
    icon: "jsr.svg",
    onAction: dep.package ? () => open(jsrUrls.site.scopePackage(dep.scope, dep.package as string)) : undefined,
  }));

  const hiddenDependencies = Math.max(0, dependencyCount - dependencyEntries.length);
  const hiddenDependents = Math.max(0, dependentCount - dependentEntries.length);

  return (
    <Detail.Metadata>
      {data ? (
        <>
          <Detail.Metadata.TagList title="Scope">
            <Detail.Metadata.TagList.Item text={`@${item.scope}`} />
            {typeof scopePackages?.total === "number" && scopePackages.total > 1 ? (
              <Detail.Metadata.TagList.Item
                text={`${scopePackages.total}`}
                icon={Icon.Box}
                onAction={() => ctx?.openScope(item.scope)}
              />
            ) : null}
            {data.isArchived ? (
              <Detail.Metadata.TagList.Item text="Archived" color={Color.Red} icon={Icon.XMarkCircle} />
            ) : null}
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label title="Last Published" text={latestPublishedText} icon={Icon.Clock} />
          <Detail.Metadata.Label title="Created" text={formatRelative(data.createdAt)} icon={Icon.Calendar} />
          <Detail.Metadata.Label
            title="Version"
            text={`${data.latestVersion ?? "unknown"}${data.versionCount ? ` (${data.versionCount} total)` : ""}`}
            icon={Icon.ComputerChip}
          />
          <Detail.Metadata.Label title="Downloads (90d)" text={totalDownloadsText} icon={Icon.Download} />
          <Detail.Metadata.Label title="Size" text={sizeText} icon={Icon.HardDrive} />
          <Detail.Metadata.Label title="Entry Points" text={entryPointsText} icon={Icon.Plug} />
          <Detail.Metadata.Separator />
        </>
      ) : null}
      <Detail.Metadata.Label
        title="Score"
        text={`${effectiveScore}%`}
        icon={{ source: getProgressIcon(effectiveScore / 100, effectiveColor, { backgroundOpacity: 0 }) }}
      />
      <Detail.Metadata.TagList title="Compatibility">
        {icons.map((ico) => (
          <Detail.Metadata.TagList.Item key={ico.text} text={ico.text} icon={ico.icon} />
        ))}
      </Detail.Metadata.TagList>
      <DepSection
        title="Dependencies"
        totalCount={dependencyCount}
        entries={dependencyEntries}
        hiddenCount={hiddenDependencies}
        moreUrl={jsrUrls.site.packageDependencies(item.scope, item.name)}
      />
      <DepSection
        title="Dependents"
        totalCount={dependentCount}
        entries={dependentEntries}
        hiddenCount={hiddenDependents}
        moreUrl={jsrUrls.site.packageDependents(item.scope, item.name)}
      />
      <Detail.Metadata.Separator />
      <Detail.Metadata.Link title="JSR" text="View on jsr.io" target={jsrUrls.site.package(item.id)} />
      {data?.githubRepository?.owner && data?.githubRepository?.name ? (
        <Detail.Metadata.Link
          title="GitHub"
          text="View on GitHub"
          target={jsrUrls.site.github(data.githubRepository.owner, data.githubRepository.name)}
        />
      ) : null}
    </Detail.Metadata>
  );
};

export default PackageMetadata;
