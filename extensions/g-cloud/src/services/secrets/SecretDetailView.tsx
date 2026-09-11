import { useEffect, useState, useMemo } from "react";
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
  Detail,
} from "@raycast/api";
import { SecretManagerService, Secret, SecretVersion } from "./SecretManagerService";
import AddVersionForm from "./components/AddVersionForm";
import SecretValueView from "./components/SecretValueView";
import { StreamerModeAction } from "../../components/StreamerModeAction";

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
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load secret details",
          message: error instanceof Error ? error.message : "Unknown error",
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
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to refresh details",
        message: error instanceof Error ? error.message : "Unknown error",
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
          push(<SecretValueView secretId={secretId} version={version} value={value} onBack={pop} />);
        }
      } catch (error) {
        (await loadingToast).hide();
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to access secret",
          message: error instanceof Error ? error.message : "Unknown error",
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
      try {
        switch (action) {
          case "enable":
            await service.enableVersion(secretId, versionId);
            break;
          case "disable":
            await service.disableVersion(secretId, versionId);
            break;
          case "destroy":
            await service.destroyVersion(secretId, versionId);
            break;
        }

        showToast({
          style: Toast.Style.Success,
          title: `Version ${action}d`,
          message: `Version ${versionId} has been ${action}d`,
        });
        await refreshData();
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: `Failed to ${action} version`,
          message: error instanceof Error ? error.message : "Unknown error",
        });
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

  // Memoize expiration status
  const expirationInfo = useMemo(() => {
    if (!secret?.expireTime) return null;
    const expireDate = new Date(secret.expireTime);
    const now = new Date();
    const isExpired = expireDate < now;
    const daysUntilExpiry = Math.ceil((expireDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return { isExpired, daysUntilExpiry, expireDate };
  }, [secret?.expireTime]);

  // Memoize replication info
  const replicationInfo = useMemo(() => {
    if (!secret?.replication) return "Unknown";
    if (secret.replication.automatic) return "Automatic";
    if (secret.replication.userManaged?.replicas) {
      return secret.replication.userManaged.replicas.map((r) => r.location).join(", ");
    }
    return "Unknown";
  }, [secret?.replication]);

  // Memoize labels section
  const labelsSection = useMemo(() => {
    if (!secret?.labels || Object.keys(secret.labels).length === 0) return null;
    return (
      <>
        <Detail.Metadata.Separator />
        <Detail.Metadata.Label title="Labels" icon={Icon.Tag} />
        {Object.entries(secret.labels).map(([key, value]) => (
          <Detail.Metadata.Label key={key} title={key} text={value} />
        ))}
      </>
    );
  }, [secret?.labels]);

  // Memoize markdown content
  const markdown = useMemo(() => {
    if (!secret) return "# Error\n\nFailed to load secret details.";

    let md = `# ${secretId}\n\n`;
    md += `#### Created ${SecretManagerService.formatRelativeTime(secret.createTime)}\n\n`;

    // Versions table
    if (versions.length > 0) {
      md += `### Version History\n\n`;
      md += "| Version | State | Created |\n";
      md += "|---------|-------|--------|\n";
      versions.slice(0, 5).forEach((version) => {
        const versionId = SecretManagerService.extractVersionId(version.name);
        const stateIcon =
          version.state === "ENABLED" ? "Active" : version.state === "DISABLED" ? "Disabled" : "Destroyed";
        md += `| ${versionId} | \`${stateIcon}\` | ${SecretManagerService.formatRelativeTime(version.createTime)} |\n`;
      });
      if (versions.length > 5) {
        md += `\n*...and ${versions.length - 5} more versions*\n`;
      }
      md += "\n";
    }

    // Rotation info
    if (secret.rotation) {
      md += `### Rotation\n\n`;
      md += `| Setting | Value |\n`;
      md += `|---------|-------|\n`;
      md += `| Period | \`${secret.rotation.rotationPeriod}\` |\n`;
      if (secret.rotation.nextRotationTime) {
        md += `| Next Rotation | ${SecretManagerService.formatRelativeTime(secret.rotation.nextRotationTime)} |\n`;
      }
      md += "\n";
    }

    // Pub/Sub Topics
    if (secret.topics && secret.topics.length > 0) {
      md += `### Pub/Sub Topics\n\n`;
      secret.topics.forEach((topic) => {
        const topicName = topic.name.split("/").pop() || topic.name;
        md += `- \`${topicName}\`\n`;
      });
      md += "\n";
    }

    md += `---\n\n`;
    md += `**Tip:** Press Enter to view the latest secret value\n`;

    return md;
  }, [secret, secretId, versions]);

  const renderOverview = () => {
    if (!secret) {
      return <Detail markdown="# Error\n\nFailed to load secret details." navigationTitle={secretId} />;
    }

    return (
      <Detail
        markdown={markdown}
        navigationTitle={`Secret: ${secretId}`}
        metadata={
          <Detail.Metadata>
            {/* Status */}
            <Detail.Metadata.TagList title="Status">
              {expirationInfo?.isExpired ? (
                <Detail.Metadata.TagList.Item text="Expired" color={Color.Red} />
              ) : (
                <Detail.Metadata.TagList.Item text="Active" color={Color.Green} />
              )}
            </Detail.Metadata.TagList>

            <Detail.Metadata.Separator />

            {/* Basic Information */}
            <Detail.Metadata.Label title="Versions" text={`${versions.length}`} icon={Icon.List} />
            <Detail.Metadata.Label
              title="Created"
              text={new Date(secret.createTime).toLocaleDateString()}
              icon={Icon.Calendar}
            />
            <Detail.Metadata.Label title="Replication" text={replicationInfo} icon={Icon.Globe} />

            {/* Expiration Info */}
            {expirationInfo && (
              <>
                <Detail.Metadata.Separator />
                <Detail.Metadata.Label
                  title={expirationInfo.isExpired ? "Expired" : "Expires"}
                  text={SecretManagerService.formatRelativeTime(secret.expireTime!)}
                  icon={expirationInfo.isExpired ? { source: Icon.Clock, tintColor: Color.Red } : Icon.Clock}
                />
              </>
            )}

            {/* TTL */}
            {secret.ttl && <Detail.Metadata.Label title="TTL" text={secret.ttl} icon={Icon.Stopwatch} />}

            {/* Rotation */}
            {secret.rotation && (
              <>
                <Detail.Metadata.Separator />
                <Detail.Metadata.Label title="Rotation" icon={Icon.ArrowClockwise} />
                <Detail.Metadata.Label title="Period" text={secret.rotation.rotationPeriod} />
                {secret.rotation.nextRotationTime && (
                  <Detail.Metadata.Label
                    title="Next Rotation"
                    text={SecretManagerService.formatRelativeTime(secret.rotation.nextRotationTime)}
                  />
                )}
              </>
            )}

            {/* Labels */}
            {labelsSection}
          </Detail.Metadata>
        }
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
            <ActionPanel.Section title="Privacy">
              <StreamerModeAction />
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
                    <ActionPanel.Section title="Privacy">
                      <StreamerModeAction />
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
