import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Detail,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { ApiErrorView } from "../../components/ApiErrorView";
import { CloudShellAction } from "../../components/CloudShellAction";
import {
  ARTIFACT_REGISTRY_MAX_PAGES,
  ArtifactDockerImage,
  deleteArtifactVersion,
  listArtifactDockerImages,
} from "../../utils/gcpApi";
import {
  formatBytes,
  formatMediaType,
  formatRelativeTime,
  formatTimestamp,
  parseDockerImage,
  ParsedDockerImage,
} from "./utils";

type TagFilter = "all" | "tagged" | "untagged";

interface DockerImagesViewProps {
  projectId: string;
  gcloudPath: string;
  location: string;
  repoName: string;
  repoConsoleUrl: string;
}

export function DockerImagesView({ projectId, gcloudPath, location, repoName, repoConsoleUrl }: DockerImagesViewProps) {
  const [tagFilter, setTagFilter] = useState<TagFilter>("all");
  const { push } = useNavigation();

  const { data, isLoading, error, revalidate } = useCachedPromise(
    async (path: string, project: string, loc: string, repo: string) => {
      return listArtifactDockerImages(path, project, loc, repo);
    },
    [gcloudPath, projectId, location, repoName],
    {
      failureToastOptions: {
        title: "Failed to fetch Docker images",
      },
    },
  );

  const images = data?.items ?? [];
  const isTruncated = data?.truncated ?? false;

  const groupedImages = useMemo(() => {
    const groups = new Map<string, Array<{ raw: ArtifactDockerImage; parsed: ParsedDockerImage }>>();

    for (const raw of images) {
      const parsed = parseDockerImage(raw, projectId, location, repoName);
      if (tagFilter === "tagged" && parsed.tags.length === 0) continue;
      if (tagFilter === "untagged" && parsed.tags.length > 0) continue;

      const list = groups.get(parsed.imageName) ?? [];
      list.push({ raw, parsed });
      groups.set(parsed.imageName, list);
    }

    // Sort groups alphabetically and images newest-first within each group
    return Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([imageName, items]) => ({
        imageName,
        items: items.sort((a, b) => {
          const aTime = new Date(a.raw.uploadTime || a.raw.updateTime || 0).getTime() || 0;
          const bTime = new Date(b.raw.uploadTime || b.raw.updateTime || 0).getTime() || 0;
          return bTime - aTime;
        }),
      }));
  }, [images, projectId, location, repoName, tagFilter]);

  async function handleDeleteImage(parsed: ParsedDockerImage): Promise<boolean> {
    if (!parsed.versionResourceName) {
      await showFailureToast("Unable to resolve version resource path for this image", {
        title: "Cannot delete image",
      });
      return false;
    }

    const tagWarning =
      parsed.tags.length > 0
        ? ` The following tag${parsed.tags.length === 1 ? "" : "s"} pointing to this digest will also be removed: ${parsed.tags.join(", ")}.`
        : "";

    const confirmed = await confirmAlert({
      title: "Delete Docker Image",
      message: `Permanently delete ${parsed.imageName} (${parsed.shortDigest})?${tagWarning} This cannot be undone.`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return false;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Deleting image...",
      message: `${parsed.imageName} (${parsed.shortDigest})`,
    });

    try {
      const result = await deleteArtifactVersion(gcloudPath, parsed.versionResourceName, true);

      toast.style = Toast.Style.Success;
      if (result.timedOut) {
        toast.title = "Deletion in progress";
        toast.message = `${parsed.imageName} (${parsed.shortDigest}) is still being deleted — refresh shortly`;
      } else {
        toast.title = "Image deleted";
        toast.message = `${parsed.imageName} (${parsed.shortDigest})`;
      }
      revalidate();
      return true;
    } catch (err) {
      await toast.hide();
      await showFailureToast(err, { title: "Failed to delete image" });
      return false;
    }
  }

  if (error && images.length === 0) {
    return (
      <List isLoading={isLoading} navigationTitle={`${repoName} — ${location}`}>
        <ApiErrorView error={error.message} projectId={projectId} apiName="artifactregistry" onRetry={revalidate} />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`${repoName} — ${location}`}
      searchBarPlaceholder="Search images by name, tag, or digest..."
      searchBarAccessory={
        <List.Dropdown tooltip="Filter Images" value={tagFilter} onChange={(val) => setTagFilter(val as TagFilter)}>
          <List.Dropdown.Item title="All Images" value="all" icon={Icon.List} />
          <List.Dropdown.Item title="Tagged Only" value="tagged" icon={Icon.Tag} />
          <List.Dropdown.Item title="Untagged Only" value="untagged" icon={Icon.Circle} />
        </List.Dropdown>
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
      {groupedImages.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Box}
          title={images.length === 0 ? "No Docker Images" : "No Matching Images"}
          description={
            images.length === 0
              ? `No container images found in "${repoName}".`
              : `No ${tagFilter} images in "${repoName}".`
          }
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
          {groupedImages.map(({ imageName, items }) => (
            <List.Section
              key={imageName}
              title={imageName}
              subtitle={`${items.length} ${items.length === 1 ? "image" : "images"}`}
            >
              {items.map(({ raw, parsed }) => {
                const isTagged = parsed.tags.length > 0;
                const title = isTagged ? parsed.tags.join(", ") : "untagged";
                const relativeUpload = formatRelativeTime(raw.uploadTime || raw.updateTime);

                return (
                  <List.Item
                    key={raw.name}
                    title={title}
                    subtitle={parsed.shortDigest}
                    keywords={[parsed.imageName, parsed.digest, ...parsed.tags]}
                    icon={{
                      source: isTagged ? Icon.Tag : Icon.Circle,
                      tintColor: isTagged ? Color.Green : Color.SecondaryText,
                    }}
                    accessories={[
                      ...(raw.imageSizeBytes ? [{ text: formatBytes(raw.imageSizeBytes), tooltip: "Image size" }] : []),
                      ...(relativeUpload
                        ? [
                            {
                              text: relativeUpload,
                              tooltip: `Uploaded ${formatTimestamp(raw.uploadTime || raw.updateTime)}`,
                            },
                          ]
                        : []),
                      {
                        tag: {
                          value: isTagged ? "Tagged" : "Untagged",
                          color: isTagged ? Color.Green : Color.SecondaryText,
                        },
                      },
                    ]}
                    actions={
                      <ActionPanel>
                        <ActionPanel.Section title="Copy">
                          <Action.CopyToClipboard
                            title={isTagged ? "Copy Tagged Pull URI" : "Copy Digest URI"}
                            content={parsed.primaryPullUri}
                          />
                          {isTagged && (
                            <Action.CopyToClipboard
                              title="Copy Digest URI"
                              content={parsed.digestUri}
                              shortcut={Keyboard.Shortcut.Common.Copy}
                            />
                          )}
                          <Action.CopyToClipboard
                            title="Copy Docker Pull Command"
                            content={`docker pull ${parsed.primaryPullUri}`}
                            shortcut={Keyboard.Shortcut.Common.CopyPath}
                          />
                        </ActionPanel.Section>
                        <ActionPanel.Section title="Inspect">
                          <Action
                            title="View Image Details"
                            icon={Icon.Eye}
                            shortcut={Keyboard.Shortcut.Common.Open}
                            onAction={() =>
                              push(
                                <DockerImageDetailView
                                  image={raw}
                                  parsed={parsed}
                                  projectId={projectId}
                                  location={location}
                                  repoName={repoName}
                                  onDelete={handleDeleteImage}
                                />,
                              )
                            }
                          />
                          <Action.OpenInBrowser
                            title="Open in Console"
                            url={parsed.consoleUrl}
                            shortcut={Keyboard.Shortcut.Common.OpenWith}
                          />
                        </ActionPanel.Section>
                        <ActionPanel.Section title="Manage">
                          {parsed.versionResourceName && (
                            <Action
                              title="Delete Image"
                              icon={Icon.Trash}
                              style={Action.Style.Destructive}
                              shortcut={Keyboard.Shortcut.Common.Remove}
                              onAction={() => handleDeleteImage(parsed)}
                            />
                          )}
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
          ))}
          {isTruncated && (
            <List.Section title="Notice">
              <List.Item
                title="Some images are not shown"
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

interface DockerImageDetailViewProps {
  image: ArtifactDockerImage;
  parsed: ParsedDockerImage;
  projectId: string;
  location: string;
  repoName: string;
  onDelete: (parsed: ParsedDockerImage) => Promise<boolean>;
}

function DockerImageDetailView({ image, parsed, projectId, location, repoName, onDelete }: DockerImageDetailViewProps) {
  const { pop } = useNavigation();
  const isTagged = parsed.tags.length > 0;
  const navSuffix = isTagged ? parsed.tags[0] : parsed.shortDigest;

  const markdown = `# ${parsed.imageName}

${
  isTagged
    ? `## Pull (Tagged)
\`\`\`bash
docker pull ${parsed.primaryPullUri}
\`\`\`
`
    : ""
}## Pull (Digest)
\`\`\`bash
docker pull ${parsed.digestUri}
\`\`\`

## Digest
\`${parsed.digest || "—"}\`
`;

  return (
    <Detail
      navigationTitle={`${parsed.imageName} (${navSuffix})`}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          {isTagged ? (
            <Detail.Metadata.TagList title="Tags">
              {parsed.tags.map((tag) => (
                <Detail.Metadata.TagList.Item key={tag} text={tag} color={Color.Green} />
              ))}
            </Detail.Metadata.TagList>
          ) : (
            <Detail.Metadata.Label title="Tags" text="Untagged" />
          )}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Repository" text={repoName} />
          <Detail.Metadata.Label title="Region" text={location} />
          <Detail.Metadata.Label title="Size" text={formatBytes(image.imageSizeBytes)} />
          <Detail.Metadata.Label title="Media Type" text={formatMediaType(image.mediaType)} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Uploaded" text={formatTimestamp(image.uploadTime)} />
          <Detail.Metadata.Label title="Updated" text={formatTimestamp(image.updateTime)} />
          {image.buildTime && <Detail.Metadata.Label title="Built" text={formatTimestamp(image.buildTime)} />}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard
              title={isTagged ? "Copy Tagged Pull URI" : "Copy Digest URI"}
              content={parsed.primaryPullUri}
            />
            {isTagged && (
              <Action.CopyToClipboard
                title="Copy Digest URI"
                content={parsed.digestUri}
                shortcut={Keyboard.Shortcut.Common.Copy}
              />
            )}
            <Action.CopyToClipboard
              title="Copy Docker Pull Command"
              content={`docker pull ${parsed.primaryPullUri}`}
              shortcut={Keyboard.Shortcut.Common.CopyPath}
            />
            {parsed.digest && <Action.CopyToClipboard title="Copy Digest" content={parsed.digest} />}
          </ActionPanel.Section>
          <ActionPanel.Section title="Manage">
            <Action.OpenInBrowser
              title="Open in Console"
              url={parsed.consoleUrl}
              shortcut={Keyboard.Shortcut.Common.OpenWith}
            />
            {parsed.versionResourceName && (
              <Action
                title="Delete Image"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={Keyboard.Shortcut.Common.Remove}
                onAction={async () => {
                  const deleted = await onDelete(parsed);
                  if (deleted) {
                    pop();
                  }
                }}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section title="Cloud Shell">
            <CloudShellAction projectId={projectId} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
