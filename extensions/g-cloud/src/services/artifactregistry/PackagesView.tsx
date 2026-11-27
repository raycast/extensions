import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { ApiErrorView } from "../../components/ApiErrorView";
import { CloudShellAction } from "../../components/CloudShellAction";
import {
  ARTIFACT_REGISTRY_MAX_PAGES,
  ArtifactPackageVersion,
  deleteArtifactVersion,
  listArtifactPackages,
  listArtifactPackageVersions,
} from "../../utils/gcpApi";
import { extractPackageName, extractTagName, extractVersionId, formatRelativeTime, formatTimestamp } from "./utils";

interface PackagesViewProps {
  projectId: string;
  gcloudPath: string;
  location: string;
  repoName: string;
  formatLabel: string;
  repoConsoleUrl: string;
}

export function PackagesView({
  projectId,
  gcloudPath,
  location,
  repoName,
  formatLabel,
  repoConsoleUrl,
}: PackagesViewProps) {
  const { push } = useNavigation();

  const { data, isLoading, error, revalidate } = useCachedPromise(
    async (path: string, project: string, loc: string, repo: string) => {
      return listArtifactPackages(path, project, loc, repo);
    },
    [gcloudPath, projectId, location, repoName],
    {
      failureToastOptions: {
        title: "Failed to fetch packages",
      },
    },
  );

  const packages = data?.items ?? [];
  const isTruncated = data?.truncated ?? false;

  if (error && packages.length === 0) {
    return (
      <List isLoading={isLoading} navigationTitle={`${repoName} — ${formatLabel}`}>
        <ApiErrorView error={error.message} projectId={projectId} apiName="artifactregistry" onRetry={revalidate} />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`${repoName} — ${formatLabel}`}
      searchBarPlaceholder={`Search ${formatLabel} packages...`}
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.RotateClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={revalidate}
          />
          <Action.OpenInBrowser
            title="Open Repository in Console"
            url={repoConsoleUrl}
            shortcut={Keyboard.Shortcut.Common.OpenWith}
          />
          <ActionPanel.Section title="Cloud Shell">
            <CloudShellAction projectId={projectId} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      {packages.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Box}
          title="No Packages Found"
          description={`No ${formatLabel} packages found in "${repoName}".`}
          actions={
            <ActionPanel>
              <Action
                title="Refresh"
                icon={Icon.RotateClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={revalidate}
              />
              <Action.OpenInBrowser title="Open Repository in Console" url={repoConsoleUrl} />
              <ActionPanel.Section title="Cloud Shell">
                <CloudShellAction projectId={projectId} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ) : (
        <>
          <List.Section title={`${formatLabel} Packages`} subtitle={`${packages.length}`}>
            {packages.map((pkg) => {
              const packageName = extractPackageName(pkg);
              const updatedRelative = formatRelativeTime(pkg.updateTime || pkg.createTime);

              return (
                <List.Item
                  key={pkg.name}
                  title={packageName}
                  keywords={[packageName, pkg.name]}
                  icon={{ source: Icon.Box, tintColor: Color.Blue }}
                  accessories={
                    updatedRelative
                      ? [
                          {
                            text: updatedRelative,
                            tooltip: `Updated ${formatTimestamp(pkg.updateTime || pkg.createTime)}`,
                          },
                        ]
                      : []
                  }
                  actions={
                    <ActionPanel>
                      <ActionPanel.Section title="Package">
                        <Action
                          title="Browse Versions"
                          icon={Icon.List}
                          onAction={() =>
                            push(
                              <PackageVersionsView
                                projectId={projectId}
                                gcloudPath={gcloudPath}
                                packageResourceName={pkg.name}
                                packageName={packageName}
                                repoConsoleUrl={repoConsoleUrl}
                              />,
                            )
                          }
                        />
                        <Action.CopyToClipboard
                          title="Copy Package Name"
                          content={packageName}
                          shortcut={Keyboard.Shortcut.Common.Copy}
                        />
                        <Action.OpenInBrowser
                          title="Open Repository in Console"
                          url={repoConsoleUrl}
                          shortcut={Keyboard.Shortcut.Common.OpenWith}
                        />
                      </ActionPanel.Section>
                      <ActionPanel.Section>
                        <Action
                          title="Refresh"
                          icon={Icon.RotateClockwise}
                          shortcut={Keyboard.Shortcut.Common.Refresh}
                          onAction={revalidate}
                        />
                      </ActionPanel.Section>
                      <ActionPanel.Section title="Cloud Shell">
                        <CloudShellAction projectId={projectId} />
                      </ActionPanel.Section>
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
          {isTruncated && (
            <List.Section title="Notice">
              <List.Item
                title="Some packages are not shown"
                subtitle={`Stopped after ${ARTIFACT_REGISTRY_MAX_PAGES} pages of results`}
                icon={{ source: Icon.Warning, tintColor: Color.Orange }}
                accessories={[{ tag: { value: "Partial", color: Color.Orange } }]}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser title="Open in Console" url={repoConsoleUrl} />
                  </ActionPanel>
                }
              />
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}

interface PackageVersionsViewProps {
  projectId: string;
  gcloudPath: string;
  packageResourceName: string;
  packageName: string;
  repoConsoleUrl: string;
}

function PackageVersionsView({
  projectId,
  gcloudPath,
  packageResourceName,
  packageName,
  repoConsoleUrl,
}: PackageVersionsViewProps) {
  const { data, isLoading, error, revalidate } = useCachedPromise(
    async (path: string, pkgName: string) => {
      return listArtifactPackageVersions(path, pkgName);
    },
    [gcloudPath, packageResourceName],
    {
      failureToastOptions: {
        title: "Failed to fetch package versions",
      },
    },
  );

  const versions = data?.items ?? [];
  const isTruncated = data?.truncated ?? false;

  async function handleDeleteVersion(version: ArtifactPackageVersion, versionId: string) {
    const confirmed = await confirmAlert({
      title: "Delete Package Version",
      message: `Permanently delete version "${versionId}" of "${packageName}"? Any tags pointing to this version will also be removed. This cannot be undone.`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Deleting version...",
      message: `${packageName}@${versionId}`,
    });

    try {
      const result = await deleteArtifactVersion(gcloudPath, version.name, true);

      toast.style = Toast.Style.Success;
      if (result.timedOut) {
        toast.title = "Deletion in progress";
        toast.message = `${packageName}@${versionId} is still being deleted — refresh shortly`;
      } else {
        toast.title = "Version deleted";
        toast.message = `${packageName}@${versionId}`;
      }
      revalidate();
    } catch (err) {
      await toast.hide();
      await showFailureToast(err, { title: "Failed to delete version" });
    }
  }

  if (error && versions.length === 0) {
    return (
      <List isLoading={isLoading} navigationTitle={`Versions — ${packageName}`}>
        <ApiErrorView error={error.message} projectId={projectId} apiName="artifactregistry" onRetry={revalidate} />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`Versions — ${packageName}`}
      searchBarPlaceholder="Search versions or tags..."
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.RotateClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={revalidate}
          />
          <Action.OpenInBrowser
            title="Open Repository in Console"
            url={repoConsoleUrl}
            shortcut={Keyboard.Shortcut.Common.OpenWith}
          />
          <ActionPanel.Section title="Cloud Shell">
            <CloudShellAction projectId={projectId} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      {versions.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Tag}
          title="No Versions Found"
          description={`No versions found for "${packageName}".`}
          actions={
            <ActionPanel>
              <Action
                title="Refresh"
                icon={Icon.RotateClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={revalidate}
              />
              <Action.OpenInBrowser title="Open Repository in Console" url={repoConsoleUrl} />
            </ActionPanel>
          }
        />
      ) : (
        <>
          <List.Section title="Versions" subtitle={`${versions.length}`}>
            {versions.map((version) => {
              const versionId = extractVersionId(version);
              const tags = (version.relatedTags ?? []).map((t) => extractTagName(t.name));
              const updatedRelative = formatRelativeTime(version.updateTime || version.createTime);

              return (
                <List.Item
                  key={version.name}
                  title={versionId}
                  subtitle={version.description}
                  keywords={[versionId, packageName, ...tags]}
                  icon={{ source: Icon.Tag, tintColor: tags.length > 0 ? Color.Green : Color.Blue }}
                  accessories={[
                    ...tags.slice(0, 2).map((tag) => ({ tag: { value: tag, color: Color.Green } })),
                    ...(updatedRelative
                      ? [
                          {
                            text: updatedRelative,
                            tooltip: `Updated ${formatTimestamp(version.updateTime || version.createTime)}`,
                          },
                        ]
                      : []),
                  ]}
                  actions={
                    <ActionPanel>
                      <ActionPanel.Section title="Copy">
                        <Action.CopyToClipboard title="Copy Version" content={versionId} />
                        <Action.CopyToClipboard
                          title="Copy Package@Version"
                          content={`${packageName}@${versionId}`}
                          shortcut={Keyboard.Shortcut.Common.Copy}
                        />
                        <Action.CopyToClipboard
                          title="Copy Resource Name"
                          content={version.name}
                          shortcut={Keyboard.Shortcut.Common.CopyPath}
                        />
                      </ActionPanel.Section>
                      <ActionPanel.Section title="Manage">
                        <Action.OpenInBrowser
                          title="Open Repository in Console"
                          url={repoConsoleUrl}
                          shortcut={Keyboard.Shortcut.Common.OpenWith}
                        />
                        <Action
                          title="Delete Version"
                          icon={Icon.Trash}
                          style={Action.Style.Destructive}
                          shortcut={Keyboard.Shortcut.Common.Remove}
                          onAction={() => handleDeleteVersion(version, versionId)}
                        />
                        <Action
                          title="Refresh"
                          icon={Icon.RotateClockwise}
                          shortcut={Keyboard.Shortcut.Common.Refresh}
                          onAction={revalidate}
                        />
                      </ActionPanel.Section>
                      <ActionPanel.Section title="Cloud Shell">
                        <CloudShellAction projectId={projectId} />
                      </ActionPanel.Section>
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
          {isTruncated && (
            <List.Section title="Notice">
              <List.Item
                title="Some versions are not shown"
                subtitle={`Stopped after ${ARTIFACT_REGISTRY_MAX_PAGES} pages of results`}
                icon={{ source: Icon.Warning, tintColor: Color.Orange }}
                accessories={[{ tag: { value: "Partial", color: Color.Orange } }]}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser title="Open in Console" url={repoConsoleUrl} />
                  </ActionPanel>
                }
              />
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}
