import { useEffect, useState } from "react";
import {
  ActionPanel,
  Action,
  List,
  Icon,
  Color,
  Toast,
  showToast,
  confirmAlert,
  Alert,
  useNavigation,
  Clipboard,
  Detail,
} from "@raycast/api";
import { SecretManagerService, Secret, SecretVersion } from "./SecretManagerService";
import AddVersionForm from "./components/AddVersionForm";
import { showFailureToast } from "@raycast/utils";

interface SecretDetailViewProps {
  secretId: string;
  projectId: string;
  gcloudPath: string;
}

export default function SecretDetailView({ secretId, projectId, gcloudPath }: SecretDetailViewProps) {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [secret, setSecret] = useState<Secret | null>(null);
  const [versions, setVersions] = useState<SecretVersion[]>([]);
  const [service, setService] = useState<SecretManagerService | null>(null);
  const [viewMode, setViewMode] = useState<"overview" | "versions">("overview");
  const { push, pop } = useNavigation();

  useEffect(() => {
    const secretService = new SecretManagerService(gcloudPath, projectId);
    setService(secretService);

    const initializeData = async () => {
      const loadingToast = showToast({
        style: Toast.Style.Animated,
        title: "Loading secret details...",
        message: "Please wait",
      });

      try {
        const [secretData, versionsData] = await Promise.all([
          secretService.describeSecret(secretId),
          secretService.listVersions(secretId),
        ]);

        setSecret(secretData);
        setVersions(versionsData);

        (await loadingToast).hide();
        showToast({
          style: Toast.Style.Success,
          title: "Secret details loaded",
          message: `Found ${versionsData.length} version${versionsData.length === 1 ? "" : "s"}`,
        });
      } catch (error) {
        (await loadingToast).hide();
        console.error("Failed to load secret details:", error);
        showFailureToast({
          title: "Failed to load secret details",
          message: error instanceof Error ? error.message : "Unknown error occurred",
        });
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
  }, [secretId, projectId, gcloudPath]);

  const refreshData = async () => {
    if (!service) return;

    setIsLoading(true);
    try {
      const [secretData, versionsData] = await Promise.all([
        service.describeSecret(secretId),
        service.listVersions(secretId),
      ]);

      setSecret(secretData);
      setVersions(versionsData);
      showToast({
        style: Toast.Style.Success,
        title: "Details refreshed",
      });
    } catch (error) {
      showFailureToast({
        title: "Failed to refresh details",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewSecretValue = async (version: string = "latest") => {
    if (!service) return;

    const confirmed = await confirmAlert({
      title: "View Secret Value",
      message: `This will reveal the secret value for version ${version}. Are you sure?`,
      primaryAction: {
        title: "View Value",
        style: Alert.ActionStyle.Default,
      },
    });

    if (confirmed) {
      const loadingToast = showToast({
        style: Toast.Style.Animated,
        title: "Accessing secret...",
        message: "Please wait",
      });

      try {
        const value = await service.accessVersion(secretId, version);
        (await loadingToast).hide();

        if (value) {
          // Show value in a detail view with auto-hide
          const markdown = `# Secret Value\n\n\`\`\`\n${value}\n\`\`\`\n\n> ⚠️ **Security Notice**: This value will be automatically cleared from your clipboard in 30 seconds.`;

          push(
            <Detail
              markdown={markdown}
              navigationTitle={`Secret Value - ${secretId}`}
              actions={
                <ActionPanel>
                  <Action
                    title="Copy to Clipboard"
                    icon={Icon.Clipboard}
                    onAction={async () => {
                      await Clipboard.copy(value);
                      showToast({
                        style: Toast.Style.Success,
                        title: "Value copied",
                        message: "Secret value has been copied to clipboard",
                      });

                      // Auto-clear clipboard after 30 seconds
                      setTimeout(async () => {
                        try {
                          const currentClipboard = await Clipboard.readText();
                          if (currentClipboard === value) {
                            await Clipboard.copy("");
                            showToast({
                              style: Toast.Style.Success,
                              title: "Clipboard cleared",
                              message: "Secret value has been automatically cleared for security",
                            });
                          }
                        } catch (error) {
                          // Silently fail if clipboard access is denied
                        }
                      }, 30000);
                    }}
                  />
                  <Action title="Back" icon={Icon.ArrowLeft} onAction={pop} />
                </ActionPanel>
              }
            />,
          );
        }
      } catch (error) {
        (await loadingToast).hide();
        showFailureToast({
          title: "Failed to access secret",
          message: error instanceof Error ? error.message : "Unknown error occurred",
        });
      }
    }
  };

  const handleVersionAction = async (version: SecretVersion, action: "enable" | "disable" | "destroy") => {
    if (!service) return;

    const versionId = SecretManagerService.extractVersionId(version.name);
    const actionName = action.charAt(0).toUpperCase() + action.slice(1);

    const confirmed = await confirmAlert({
      title: `${actionName} Version`,
      message: `Are you sure you want to ${action} version ${versionId}?${action === "destroy" ? " This action cannot be undone." : ""}`,
      primaryAction: {
        title: actionName,
        style: action === "destroy" ? Alert.ActionStyle.Destructive : Alert.ActionStyle.Default,
      },
    });

    if (confirmed) {
      let success = false;
      switch (action) {
        case "enable":
          success = await service.enableVersion(secretId, versionId);
          break;
        case "disable":
          success = await service.disableVersion(secretId, versionId);
          break;
        case "destroy":
          success = await service.destroyVersion(secretId, versionId);
          break;
      }

      if (success) {
        showToast({
          style: Toast.Style.Success,
          title: `Version ${action}d`,
          message: `Version ${versionId} has been ${action}d`,
        });
        await refreshData();
      }
    }
  };

  const handleAddVersion = () => {
    push(
      <AddVersionForm secretId={secretId} projectId={projectId} gcloudPath={gcloudPath} onVersionAdded={refreshData} />,
    );
  };

  const getVersionIcon = (version: SecretVersion): { source: Icon; tintColor?: Color } => {
    switch (version.state) {
      case "ENABLED":
        return { source: Icon.CheckCircle, tintColor: Color.Green };
      case "DISABLED":
        return { source: Icon.XMarkCircle, tintColor: Color.Orange };
      case "DESTROYED":
        return { source: Icon.Trash, tintColor: Color.Red };
      default:
        return { source: Icon.QuestionMark, tintColor: Color.SecondaryText };
    }
  };

  const renderOverview = () => {
    if (!secret) {
      return <Detail markdown="# Error\n\nFailed to load secret details." navigationTitle={secretId} />;
    }

    const metadata: string[] = [];

    // Basic information
    metadata.push(`**Name:** ${secretId}`);
    metadata.push(`**Created:** ${SecretManagerService.formatRelativeTime(secret.createTime)}`);
    metadata.push(`**Versions:** ${versions.length}`);

    // Expiration
    if (secret.expireTime) {
      const expireDate = new Date(secret.expireTime);
      const now = new Date();
      const isExpired = expireDate < now;
      metadata.push(
        `**${isExpired ? "Expired" : "Expires"}:** ${SecretManagerService.formatRelativeTime(secret.expireTime)}`,
      );
    }

    // TTL
    if (secret.ttl) {
      metadata.push(`**TTL:** ${secret.ttl}`);
    }

    // Rotation
    if (secret.rotation) {
      metadata.push(`**Rotation Period:** ${secret.rotation.rotationPeriod}`);
      if (secret.rotation.nextRotationTime) {
        metadata.push(
          `**Next Rotation:** ${SecretManagerService.formatRelativeTime(secret.rotation.nextRotationTime)}`,
        );
      }
    }

    // Replication
    if (secret.replication) {
      if (secret.replication.automatic) {
        metadata.push(`**Replication:** Automatic`);
      } else if (secret.replication.userManaged?.replicas) {
        const locations = secret.replication.userManaged.replicas.map((r) => r.location).join(", ");
        metadata.push(`**Replication:** User-managed (${locations})`);
      }
    }

    // Labels
    if (secret.labels && Object.keys(secret.labels).length > 0) {
      metadata.push(`**Labels:**`);
      Object.entries(secret.labels).forEach(([key, value]) => {
        metadata.push(`  - ${key}: ${value}`);
      });
    }

    // Topics
    if (secret.topics && secret.topics.length > 0) {
      metadata.push(`**Pub/Sub Topics:**`);
      secret.topics.forEach((topic) => {
        metadata.push(`  - ${topic.name}`);
      });
    }

    const markdown = `# ${secretId}\n\n${metadata.join("\n")}\n\n---\n\n**Latest Versions:**\n\n${versions
      .slice(0, 5)
      .map((version) => {
        const versionId = SecretManagerService.extractVersionId(version.name);
        const stateIcon = version.state === "ENABLED" ? "🟢" : version.state === "DISABLED" ? "🟡" : "🔴";
        return `${stateIcon} **Version ${versionId}** - ${version.state} (${SecretManagerService.formatRelativeTime(version.createTime)})`;
      })
      .join("\n")}`;

    return (
      <Detail
        markdown={markdown}
        navigationTitle={secretId}
        actions={
          <ActionPanel>
            <ActionPanel.Section title="Secret Actions">
              <Action title="View Latest Value" icon={Icon.Eye} onAction={() => handleViewSecretValue("latest")} />
              <Action
                title="Add New Version"
                icon={Icon.Plus}
                onAction={handleAddVersion}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
              />
              <Action title="View All Versions" icon={Icon.List} onAction={() => setViewMode("versions")} />
            </ActionPanel.Section>
            <ActionPanel.Section title="Navigation">
              <Action title="Back" icon={Icon.ArrowLeft} onAction={pop} />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={refreshData}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  };

  const renderVersions = () => {
    return (
      <List
        isLoading={isLoading}
        navigationTitle={`${secretId} - Versions`}
        searchBarPlaceholder="Search versions..."
        actions={
          <ActionPanel>
            <Action title="Add New Version" icon={Icon.Plus} onAction={handleAddVersion} />
            <Action title="Back to Overview" icon={Icon.ArrowLeft} onAction={() => setViewMode("overview")} />
          </ActionPanel>
        }
      >
        {versions.length === 0 ? (
          <List.EmptyView
            icon={Icon.List}
            title="No versions found"
            description="This secret has no versions"
            actions={
              <ActionPanel>
                <Action title="Add New Version" icon={Icon.Plus} onAction={handleAddVersion} />
              </ActionPanel>
            }
          />
        ) : (
          versions.map((version) => {
            const versionId = SecretManagerService.extractVersionId(version.name);
            const isLatest = versions.indexOf(version) === 0;

            return (
              <List.Item
                key={version.name}
                id={version.name}
                title={`Version ${versionId}`}
                subtitle={`${version.state} • Created ${SecretManagerService.formatRelativeTime(version.createTime)}`}
                icon={getVersionIcon(version)}
                accessories={[
                  ...(isLatest ? [{ text: "Latest", icon: Icon.Star }] : []),
                  ...(version.destroyTime
                    ? [{ text: `Destroyed ${SecretManagerService.formatRelativeTime(version.destroyTime)}` }]
                    : []),
                ]}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section title="Version Actions">
                      {version.state === "ENABLED" && (
                        <Action title="View Value" icon={Icon.Eye} onAction={() => handleViewSecretValue(versionId)} />
                      )}
                      {version.state === "ENABLED" && (
                        <Action
                          title="Disable Version"
                          icon={Icon.XMarkCircle}
                          onAction={() => handleVersionAction(version, "disable")}
                        />
                      )}
                      {version.state === "DISABLED" && (
                        <Action
                          title="Enable Version"
                          icon={Icon.CheckCircle}
                          onAction={() => handleVersionAction(version, "enable")}
                        />
                      )}
                      {version.state !== "DESTROYED" && (
                        <Action
                          title="Destroy Version"
                          icon={Icon.Trash}
                          style={Action.Style.Destructive}
                          onAction={() => handleVersionAction(version, "destroy")}
                        />
                      )}
                    </ActionPanel.Section>
                    <ActionPanel.Section title="Secret Management">
                      <Action
                        title="Add New Version"
                        icon={Icon.Plus}
                        onAction={handleAddVersion}
                        shortcut={{ modifiers: ["cmd"], key: "n" }}
                      />
                      <Action title="Back to Overview" icon={Icon.ArrowLeft} onAction={() => setViewMode("overview")} />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })
        )}
      </List>
    );
  };

  if (isLoading) {
    return (
      <Detail markdown="# Loading...\n\nPlease wait while we load the secret details." navigationTitle={secretId} />
    );
  }

  return viewMode === "overview" ? renderOverview() : renderVersions();
}
