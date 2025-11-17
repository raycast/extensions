import {
  ActionPanel,
  Action,
  List,
  showToast,
  Toast,
  Icon,
  confirmAlert,
  Detail,
  Color,
  useNavigation,
} from "@raycast/api";
import { useState, useEffect, useCallback, useRef } from "react";
import { exec } from "child_process";
import { promisify } from "util";
import {
  formatFileSize,
  formatTimestamp,
  formatGeneration,
  isCurrentVersion,
  calculateAge,
} from "../../utils/FileUtils";
import { showFailureToast } from "@raycast/utils";

const execPromise = promisify(exec);

interface ObjectVersionsViewProps {
  projectId: string;
  gcloudPath: string;
  bucketName: string;
  objectName: string;
}

interface ObjectVersion {
  id: string;
  generation: string;
  size: string;
  updated: string;
  timeCreated: string;
  isCurrent: boolean;
  metageneration: string;
  contentType: string;
  storageClass: string;
  etag: string;
  md5Hash?: string;
  crc32c?: string;
  timeDeleted?: string;
}

interface ApiObjectVersion {
  id?: string;
  name: string;
  generation?: string;
  size?: string;
  updated?: string;
  timeCreated?: string;
  isCurrent?: boolean;
  metageneration?: string;
  contentType?: string;
  storageClass?: string;
  etag?: string;
  md5Hash?: string;
  crc32c?: string;
  timeDeleted?: string;
  [key: string]: string | boolean | undefined;
}

interface ErrorResponse {
  message: string;
  includes(text: string): boolean;
}

interface AccessoryItem {
  text: string;
  tooltip?: string;
  icon?: Icon;
}

type CacheResult = ApiObjectVersion[] | string | null;

function parseSizeToNumber(size: string | undefined): number {
  if (!size) return 0;
  try {
    const parsed = parseInt(size, 10);
    return isNaN(parsed) ? 0 : parsed;
  } catch {
    return 0;
  }
}

export default function ObjectVersionsView({ projectId, gcloudPath, bucketName, objectName }: ObjectVersionsViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [versions, setVersions] = useState<ObjectVersion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { push, pop } = useNavigation();

  const cacheRef = useRef(new Map<string, CacheResult>());

  function invalidateCache(pattern: RegExp) {
    for (const key of cacheRef.current.keys()) {
      if (pattern.test(key)) {
        cacheRef.current.delete(key);
      }
    }
  }

  async function executeCommand(
    gcloudPath: string,
    command: string,
    options: {
      projectId?: string;
      formatJson?: boolean;
      quiet?: boolean;
      retries?: number;
    } = {},
  ) {
    const { projectId, formatJson = true, quiet = false, retries = 0 } = options;

    const projectFlag = projectId ? ` --project=${projectId}` : "";
    const formatFlag = formatJson ? " --format=json" : "";
    const quietFlag = quiet ? " --quiet" : "";

    const fullCommand = `${gcloudPath} ${command}${projectFlag}${formatFlag}${quietFlag}`;

    const cacheKey = fullCommand;
    if (cacheRef.current.has(cacheKey)) {
      return cacheRef.current.get(cacheKey);
    }

    try {
      const { stdout, stderr } = await execPromise(fullCommand);

      if (stderr && stderr.includes("ERROR")) {
        throw new Error(stderr);
      }

      if (!formatJson) {
        return stdout;
      }

      if (!stdout || stdout.trim() === "") {
        return [];
      }

      const result = JSON.parse(stdout);

      cacheRef.current.set(cacheKey, result);

      return result;
    } catch (error) {
      if (retries > 0) {
        return executeCommand(gcloudPath, command, {
          projectId,
          formatJson,
          quiet,
          retries: retries - 1,
        });
      }
      throw error;
    }
  }

  const fetchVersions = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const loadingToast = await showToast({
      style: Toast.Style.Animated,
      title: "Loading object versions...",
      message: `Object: ${objectName}`,
    });

    try {
      const result = await executeCommand(
        gcloudPath,
        `storage objects list gs://${bucketName} --include="${objectName}" --versions`,
        {
          projectId,
          retries: 1,
        },
      );

      if (!result || (Array.isArray(result) && result.length === 0)) {
        setVersions([]);
        loadingToast.hide();
        showToast({
          style: Toast.Style.Success,
          title: "No versions found",
          message: `Object "${objectName}" has no versions or versioning is not enabled`,
        });
        return;
      }

      const formattedVersions = result.map((version: ApiObjectVersion) => {
        return {
          id: version.id || `${version.name}-${version.generation}`,
          generation: version.generation || "Unknown",
          size: formatFileSize(parseSizeToNumber(version.size)),
          updated: version.updated || version.timeCreated || new Date().toISOString(),
          timeCreated: version.timeCreated || version.updated || new Date().toISOString(),
          isCurrent: isCurrentVersion(version),
          metageneration: version.metageneration || "1",
          contentType: version.contentType || "application/octet-stream",
          storageClass: version.storageClass || "STANDARD",
          etag: version.etag || "Unknown",
          md5Hash: version.md5Hash,
          crc32c: version.crc32c,
          timeDeleted: version.timeDeleted,
        };
      });

      formattedVersions.sort((a: ObjectVersion, b: ObjectVersion) => {
        const genA = parseInt(a.generation, 10) || 0;
        const genB = parseInt(b.generation, 10) || 0;
        return genB - genA;
      });

      setVersions(formattedVersions);

      loadingToast.hide();
      showToast({
        style: Toast.Style.Success,
        title: "Versions loaded",
        message: `Found ${formattedVersions.length} versions`,
      });
    } catch (error) {
      loadingToast.hide();
      console.error("Error fetching object versions:", error);

      let errorMessage = error instanceof Error ? error.message : String(error);
      let errorTitle = "Failed to load versions";

      const errorResponse = error as ErrorResponse;
      if (errorResponse.message && typeof errorResponse.message === "string") {
        if (errorResponse.message.includes("Permission denied") || errorResponse.message.includes("403")) {
          errorTitle = "Permission denied";
          errorMessage = `You don't have permission to list versions for "${objectName}".`;
        } else if (errorResponse.message.includes("not found") || errorResponse.message.includes("404")) {
          errorTitle = "Object not found";
          errorMessage = `The object "${objectName}" was not found. It may have been deleted.`;
        } else if (errorResponse.message.includes("versioning not enabled")) {
          errorTitle = "Versioning not enabled";
          errorMessage = `Versioning is not enabled for bucket "${bucketName}".`;
        }
      }

      setError(`${errorTitle}: ${errorMessage}`);

      showFailureToast({
        title: errorTitle,
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }, [projectId, gcloudPath, bucketName, objectName]);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  async function restoreVersion(generation: string) {
    const options = {
      title: "Restore Version",
      message: `Are you sure you want to restore version ${formatGeneration(generation)}?`,
      icon: Icon.ArrowClockwise,
      primaryAction: {
        title: "Restore",
      },
    };

    if (await confirmAlert(options)) {
      const restoringToast = await showToast({
        style: Toast.Style.Animated,
        title: "Restoring version...",
        message: `Generation: ${formatGeneration(generation)}`,
      });

      try {
        await executeCommand(
          gcloudPath,
          `storage objects restore gs://${bucketName}/${objectName} --generation=${generation}`,
          {
            projectId,
            formatJson: false,
            quiet: true,
          },
        );

        restoringToast.hide();
        showToast({
          style: Toast.Style.Success,
          title: "Version restored successfully",
          message: `Object ${objectName} restored to version ${formatGeneration(generation)}`,
        });

        invalidateCache(new RegExp(`gs://${bucketName}/${objectName}`));
        fetchVersions();
      } catch (error) {
        restoringToast.hide();
        console.error("Error restoring version:", error);

        let errorMessage = error instanceof Error ? error.message : String(error);
        let errorTitle = "Failed to restore version";

        if (errorMessage.includes("Permission denied") || errorMessage.includes("403")) {
          errorTitle = "Permission denied";
          errorMessage = "You don't have permission to restore this version.";
        } else if (errorMessage.includes("not found") || errorMessage.includes("404")) {
          errorTitle = "Version not found";
          errorMessage = `The version "${generation}" was not found.`;
        }

        showFailureToast({
          title: errorTitle,
          message: errorMessage,
        });
      }
    }
  }

  async function deleteVersion(generation: string) {
    const options = {
      title: "Delete Version",
      message: `Are you sure you want to delete version ${formatGeneration(generation)}?`,
      icon: Icon.Trash,
      primaryAction: {
        title: "Delete",
      },
    };

    if (await confirmAlert(options)) {
      const deletingToast = await showToast({
        style: Toast.Style.Animated,
        title: "Deleting version...",
        message: `Generation: ${formatGeneration(generation)}`,
      });

      try {
        await executeCommand(gcloudPath, `storage rm gs://${bucketName}/${objectName} --generation=${generation}`, {
          projectId,
          formatJson: false,
          quiet: true,
        });

        deletingToast.hide();
        showToast({
          style: Toast.Style.Success,
          title: "Version deleted successfully",
          message: `Version ${formatGeneration(generation)} deleted`,
        });

        invalidateCache(new RegExp(`gs://${bucketName}/${objectName}`));
        fetchVersions();
      } catch (error) {
        deletingToast.hide();
        console.error("Error deleting version:", error);

        let errorMessage = error instanceof Error ? error.message : String(error);
        let errorTitle = "Failed to delete version";

        if (errorMessage.includes("Permission denied") || errorMessage.includes("403")) {
          errorTitle = "Permission denied";
          errorMessage = "You don't have permission to delete this version.";
        } else if (errorMessage.includes("not found") || errorMessage.includes("404")) {
          errorTitle = "Version not found";
          errorMessage = `The version "${generation}" was not found. It may have been deleted already.`;
        }

        showFailureToast({
          title: errorTitle,
          message: errorMessage,
        });
      }
    }
  }

  async function viewVersionDetails(version: ObjectVersion) {
    const detailsMarkdown =
      `# Version Details\n\n` +
      `**Object:** ${objectName}\n\n` +
      `**Generation:** ${formatGeneration(version.generation)}\n\n` +
      `**Size:** ${version.size}\n\n` +
      `**Content Type:** ${version.contentType}\n\n` +
      `**Created:** ${formatTimestamp(version.timeCreated)}\n\n` +
      `**Updated:** ${formatTimestamp(version.updated)}\n\n` +
      `**Storage Class:** ${version.storageClass}\n\n` +
      `**MD5 Hash:** ${version.md5Hash || "N/A"}\n\n` +
      `**CRC32C:** ${version.crc32c || "N/A"}\n\n` +
      `**ETag:** ${version.etag}\n\n` +
      `**Metageneration:** ${version.metageneration}\n\n` +
      (version.timeDeleted ? `**Deleted:** ${formatTimestamp(version.timeDeleted)}\n\n` : "") +
      `**Status:** ${version.isCurrent ? "Current Version" : "Previous Version"}\n\n`;

    push(
      <Detail
        navigationTitle={`Version: ${formatGeneration(version.generation)}`}
        markdown={detailsMarkdown}
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.Label title="Object" text={objectName} />
            <Detail.Metadata.Label title="Generation" text={formatGeneration(version.generation)} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Size" text={version.size} />
            <Detail.Metadata.Label title="Content Type" text={version.contentType} />
            <Detail.Metadata.Label title="Storage Class" text={version.storageClass} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Created" text={formatTimestamp(version.timeCreated)} />
            <Detail.Metadata.Label title="Updated" text={formatTimestamp(version.updated)} />
            {version.timeDeleted && (
              <Detail.Metadata.Label title="Deleted" text={formatTimestamp(version.timeDeleted)} />
            )}
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Status" text={version.isCurrent ? "Current Version" : "Previous Version"} />
            <Detail.Metadata.Label title="Age" text={calculateAge(version.timeCreated)} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="MD5 Hash" text={version.md5Hash || "N/A"} />
            <Detail.Metadata.Label title="CRC32C" text={version.crc32c || "N/A"} />
            <Detail.Metadata.Label title="ETag" text={version.etag} />
            <Detail.Metadata.Label title="Metageneration" text={version.metageneration} />
          </Detail.Metadata>
        }
        actions={
          <ActionPanel>
            {!version.isCurrent && (
              <Action
                title="Restore Version"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                onAction={() => restoreVersion(version.generation)}
              />
            )}
            <Action
              title="Delete Version"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
              onAction={() => deleteVersion(version.generation)}
            />
            <Action
              title="Back to Versions"
              icon={Icon.ArrowLeft}
              shortcut={{ modifiers: ["cmd"], key: "b" }}
              onAction={() => pop()}
            />
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={fetchVersions}
            />
          </ActionPanel>
        }
      />,
    );
  }

  if (error) {
    return (
      <List isLoading={false}>
        <List.EmptyView
          title={error}
          description="Click to try again"
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.RotateClockwise} onAction={fetchVersions} />
              <Action title="Back" icon={Icon.ArrowLeft} onAction={pop} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search versions..."
      navigationTitle={`Versions of ${objectName}`}
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={fetchVersions}
          />
          <Action title="Back" icon={Icon.ArrowLeft} shortcut={{ modifiers: ["cmd"], key: "b" }} onAction={pop} />
        </ActionPanel>
      }
    >
      {versions.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No versions found"
          description={`Object "${objectName}" has no versions or versioning is not enabled for bucket "${bucketName}".`}
          icon={{ source: Icon.Clock, tintColor: Color.Blue }}
          actions={
            <ActionPanel>
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={fetchVersions}
              />
              <Action title="Back" icon={Icon.ArrowLeft} shortcut={{ modifiers: ["cmd"], key: "b" }} onAction={pop} />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section
          title="Object Versions"
          subtitle={`${versions.length} ${versions.length === 1 ? "version" : "versions"}`}
        >
          {versions.map((version) => (
            <List.Item
              key={version.id}
              title={version.isCurrent ? "Current Version" : `Version ${formatGeneration(version.generation)}`}
              subtitle={`Created: ${formatTimestamp(version.timeCreated)}`}
              icon={{
                source: version.isCurrent ? Icon.CheckCircle : Icon.Clock,
                tintColor: version.isCurrent ? Color.Green : Color.Blue,
              }}
              accessories={
                [
                  { text: version.size, tooltip: "Size" },
                  { text: calculateAge(version.timeCreated), tooltip: "Age" },
                  version.timeDeleted
                    ? { text: "Deleted", icon: Icon.Trash, tooltip: formatTimestamp(version.timeDeleted) }
                    : null,
                ].filter(Boolean) as AccessoryItem[]
              }
              actions={
                <ActionPanel>
                  <Action
                    title="View Details"
                    icon={Icon.Eye}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                    onAction={() => viewVersionDetails(version)}
                  />
                  {!version.isCurrent && (
                    <Action
                      title="Restore Version"
                      icon={Icon.ArrowClockwise}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                      onAction={() => restoreVersion(version.generation)}
                    />
                  )}
                  <Action
                    title="Delete Version"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
                    onAction={() => deleteVersion(version.generation)}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={fetchVersions}
                  />
                  <Action
                    title="Back"
                    icon={Icon.ArrowLeft}
                    shortcut={{ modifiers: ["cmd"], key: "b" }}
                    onAction={pop}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
