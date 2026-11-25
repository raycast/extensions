import { Action, ActionPanel, Color, Detail, Icon, Keyboard, List, useNavigation } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect } from "react";
import { ApiErrorView } from "../../components/ApiErrorView";
import { CloudShellAction } from "../../components/CloudShellAction";
import { ARTIFACT_REGISTRY_MAX_PAGES, ArtifactRepository, listArtifactRepositories } from "../../utils/gcpApi";
import { initializeQuickLink } from "../../utils/QuickLinks";
import { ServiceViewBar } from "../../utils/ServiceViewBar";
import { DockerImagesView } from "./DockerImagesView";
import { PackagesView } from "./PackagesView";
import {
  formatBytes,
  formatTimestamp,
  getDockerAuthHost,
  getFormatPresentation,
  ParsedRepository,
  parseRepository,
} from "./utils";

interface ArtifactRegistryViewProps {
  projectId: string;
  gcloudPath: string;
}

export default function ArtifactRegistryView({ projectId, gcloudPath }: ArtifactRegistryViewProps) {
  const { push } = useNavigation();

  useEffect(() => {
    initializeQuickLink(projectId);
  }, [projectId]);

  const { data, isLoading, error, revalidate } = useCachedPromise(
    async (path: string, project: string) => {
      return listArtifactRepositories(path, project);
    },
    [gcloudPath, projectId],
    {
      failureToastOptions: {
        title: "Failed to fetch repositories",
      },
    },
  );

  const repositories = data?.items ?? [];
  const isTruncated = data?.truncated ?? false;
  const failedLocations = data?.failedLocations ?? [];

  function openRepository(repo: ArtifactRepository, parsed: ParsedRepository) {
    if (repo.format?.toUpperCase() === "DOCKER") {
      push(
        <DockerImagesView
          projectId={projectId}
          gcloudPath={gcloudPath}
          location={parsed.location}
          repoName={parsed.repoName}
          repoConsoleUrl={parsed.consoleUrl}
        />,
      );
      return;
    }

    push(
      <PackagesView
        projectId={projectId}
        gcloudPath={gcloudPath}
        location={parsed.location}
        repoName={parsed.repoName}
        formatLabel={parsed.formatLabel}
        repoConsoleUrl={parsed.consoleUrl}
      />,
    );
  }

  function viewRepositoryDetails(repo: ArtifactRepository, parsed: ParsedRepository) {
    push(
      <RepositoryDetailView
        repo={repo}
        parsed={parsed}
        projectId={projectId}
        onBrowse={() => openRepository(repo, parsed)}
      />,
    );
  }

  if (error && repositories.length === 0) {
    return (
      <List
        isLoading={isLoading}
        navigationTitle={`Artifact Registry - ${projectId}`}
        searchBarAccessory={
          <ServiceViewBar projectId={projectId} gcloudPath={gcloudPath} serviceName="artifactregistry" />
        }
      >
        <ApiErrorView error={error.message} projectId={projectId} apiName="artifactregistry" onRetry={revalidate} />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search Artifact Registry repositories..."
      navigationTitle={`Artifact Registry - ${projectId}`}
      searchBarAccessory={
        <ServiceViewBar projectId={projectId} gcloudPath={gcloudPath} serviceName="artifactregistry" />
      }
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.RotateClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={revalidate}
          />
          <Action.OpenInBrowser
            title="Open Artifact Registry Console"
            url={`https://console.cloud.google.com/artifacts?project=${encodeURIComponent(projectId)}`}
            shortcut={Keyboard.Shortcut.Common.OpenWith}
          />
          <ActionPanel.Section title="Cloud Shell">
            <CloudShellAction projectId={projectId} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      {repositories.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Box}
          title="No Artifact Registry Repositories"
          description="Create a repository in Cloud Console to store container images or packages."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open Artifact Registry Console"
                url={`https://console.cloud.google.com/artifacts?project=${encodeURIComponent(projectId)}`}
              />
              <Action
                title="Refresh"
                icon={Icon.RotateClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={revalidate}
              />
              <ActionPanel.Section title="Cloud Shell">
                <CloudShellAction projectId={projectId} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ) : (
        <>
          <List.Section
            title="Repositories"
            subtitle={`${repositories.length} ${repositories.length === 1 ? "repo" : "repos"}`}
          >
            {repositories.map((repo) => {
              const parsed = parseRepository(repo, projectId);
              const presentation = getFormatPresentation(repo.format);
              const isDocker = repo.format?.toUpperCase() === "DOCKER";

              return (
                <List.Item
                  key={repo.name}
                  title={parsed.repoName}
                  subtitle={parsed.location}
                  keywords={[parsed.location, parsed.formatLabel, parsed.modeLabel, parsed.registryUri]}
                  icon={{ source: presentation.icon, tintColor: presentation.color }}
                  accessories={[
                    ...(repo.sizeBytes
                      ? [{ text: formatBytes(repo.sizeBytes), tooltip: "Total repository size" }]
                      : []),
                    { tag: parsed.modeLabel },
                    { tag: { value: parsed.formatLabel, color: presentation.color } },
                  ]}
                  actions={
                    <ActionPanel>
                      <ActionPanel.Section title="Repository">
                        <Action
                          title={isDocker ? "Browse Images" : "Browse Packages"}
                          icon={Icon.ArrowRight}
                          onAction={() => openRepository(repo, parsed)}
                        />
                        <Action
                          title="View Details"
                          icon={Icon.Eye}
                          shortcut={Keyboard.Shortcut.Common.Open}
                          onAction={() => viewRepositoryDetails(repo, parsed)}
                        />
                        <Action.OpenInBrowser
                          title="Open in Console"
                          url={parsed.consoleUrl}
                          shortcut={Keyboard.Shortcut.Common.OpenWith}
                        />
                      </ActionPanel.Section>
                      <ActionPanel.Section title="Copy">
                        <Action.CopyToClipboard
                          title="Copy Registry URI"
                          content={parsed.registryUri}
                          shortcut={Keyboard.Shortcut.Common.Copy}
                        />
                        {isDocker && (
                          <Action.CopyToClipboard
                            title="Copy Docker Auth Command"
                            content={`gcloud auth configure-docker ${getDockerAuthHost(parsed.registryUri, parsed.location)}`}
                            shortcut={Keyboard.Shortcut.Common.CopyPath}
                          />
                        )}
                        <Action.CopyToClipboard
                          title="Copy Repository Name"
                          content={parsed.repoName}
                          shortcut={Keyboard.Shortcut.Common.CopyName}
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
          {(isTruncated || failedLocations.length > 0) && (
            <List.Section title="Notice">
              {failedLocations.length > 0 && (
                <List.Item
                  title="Some regions could not be loaded"
                  subtitle={`${failedLocations.length} ${failedLocations.length === 1 ? "location" : "locations"} failed: ${failedLocations.slice(0, 3).join(", ")}${failedLocations.length > 3 ? "…" : ""}`}
                  icon={{ source: Icon.Warning, tintColor: Color.Orange }}
                  accessories={[{ tag: { value: "Partial", color: Color.Orange } }]}
                  actions={
                    <ActionPanel>
                      <Action
                        title="Retry"
                        icon={Icon.RotateClockwise}
                        shortcut={Keyboard.Shortcut.Common.Refresh}
                        onAction={revalidate}
                      />
                      <Action.OpenInBrowser
                        title="Open in Console"
                        url={`https://console.cloud.google.com/artifacts?project=${encodeURIComponent(projectId)}`}
                      />
                    </ActionPanel>
                  }
                />
              )}
              {isTruncated && (
                <List.Item
                  title="Some repositories are not shown"
                  subtitle={`Stopped after ${ARTIFACT_REGISTRY_MAX_PAGES} pages of results`}
                  icon={{ source: Icon.Warning, tintColor: Color.Orange }}
                  accessories={[{ tag: { value: "Partial", color: Color.Orange } }]}
                  actions={
                    <ActionPanel>
                      <Action.OpenInBrowser
                        title="Open in Console"
                        url={`https://console.cloud.google.com/artifacts?project=${encodeURIComponent(projectId)}`}
                      />
                    </ActionPanel>
                  }
                />
              )}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}

interface RepositoryDetailViewProps {
  repo: ArtifactRepository;
  parsed: ParsedRepository;
  projectId: string;
  onBrowse: () => void;
}

function RepositoryDetailView({ repo, parsed, projectId, onBrowse }: RepositoryDetailViewProps) {
  const isDocker = repo.format?.toUpperCase() === "DOCKER";
  const dockerAuthHost = getDockerAuthHost(parsed.registryUri, parsed.location);
  const cleanupCount = repo.cleanupPolicies ? Object.keys(repo.cleanupPolicies).length : 0;
  const labelEntries = repo.labels ? Object.entries(repo.labels) : [];

  const markdown = `# ${parsed.repoName}

${repo.description ? `${repo.description}\n\n` : ""}## Registry URI
\`\`\`
${parsed.registryUri}
\`\`\`
${
  isDocker
    ? `
## Configure Docker Authentication
\`\`\`bash
gcloud auth configure-docker ${dockerAuthHost}
\`\`\`
`
    : ""
}`;

  return (
    <Detail
      navigationTitle={parsed.repoName}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Format" text={parsed.formatLabel} />
          <Detail.Metadata.Label title="Mode" text={parsed.modeLabel} />
          <Detail.Metadata.Label title="Region" text={parsed.location} />
          <Detail.Metadata.Label title="Total Size" text={formatBytes(repo.sizeBytes)} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Encryption"
            text={repo.kmsKeyName ? "Customer-managed (CMEK)" : "Google-managed"}
          />
          <Detail.Metadata.Label
            title="Cleanup Policies"
            text={
              cleanupCount > 0
                ? `${cleanupCount} ${cleanupCount === 1 ? "policy" : "policies"}${repo.cleanupPolicyDryRun ? " (Dry Run)" : ""}`
                : "None"
            }
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Created" text={formatTimestamp(repo.createTime)} />
          <Detail.Metadata.Label title="Updated" text={formatTimestamp(repo.updateTime)} />
          {labelEntries.length > 0 && (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.TagList title="Labels">
                {labelEntries.map(([key, value]) => (
                  <Detail.Metadata.TagList.Item key={key} text={`${key}=${value}`} />
                ))}
              </Detail.Metadata.TagList>
            </>
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Repository">
            <Action title={isDocker ? "Browse Images" : "Browse Packages"} icon={Icon.ArrowRight} onAction={onBrowse} />
            <Action.OpenInBrowser
              title="Open in Console"
              url={parsed.consoleUrl}
              shortcut={Keyboard.Shortcut.Common.OpenWith}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard
              title="Copy Registry URI"
              content={parsed.registryUri}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
            {isDocker && (
              <Action.CopyToClipboard
                title="Copy Docker Auth Command"
                content={`gcloud auth configure-docker ${dockerAuthHost}`}
                shortcut={Keyboard.Shortcut.Common.CopyPath}
              />
            )}
            <Action.CopyToClipboard
              title="Copy Repository Name"
              content={parsed.repoName}
              shortcut={Keyboard.Shortcut.Common.CopyName}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Cloud Shell">
            <CloudShellAction projectId={projectId} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
