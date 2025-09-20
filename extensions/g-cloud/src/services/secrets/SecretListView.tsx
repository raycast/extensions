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
} from "@raycast/api";
import { SecretManagerService, Secret } from "./SecretManagerService";
import SecretDetailView from "./SecretDetailView";
import CreateSecretForm from "./components/CreateSecretForm";
import { showFailureToast } from "@raycast/utils";
import { QuickProjectSwitcher } from "../../utils/QuickProjectSwitcher";

interface SecretListViewProps {
  projectId: string;
  gcloudPath: string;
  onProjectChange: (projectId: string) => void;
}

export default function SecretListView({ projectId, gcloudPath, onProjectChange }: SecretListViewProps) {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [filteredSecrets, setFilteredSecrets] = useState<Secret[]>([]);
  const [searchText, setSearchText] = useState<string>("");
  const [service, setService] = useState<SecretManagerService | null>(null);
  const { push } = useNavigation();

  useEffect(() => {
    const secretService = new SecretManagerService(gcloudPath, projectId);
    setService(secretService);

    const initializeData = async () => {
      const loadingToast = showToast({
        style: Toast.Style.Animated,
        title: "Loading secrets...",
        message: "Please wait while we fetch your secrets",
      });

      try {
        const secretsData = await secretService.listSecrets();
        setSecrets(secretsData);
        setFilteredSecrets(secretsData);

        (await loadingToast).hide();

        if (secretsData.length === 0) {
          showToast({
            style: Toast.Style.Success,
            title: "No secrets found",
            message: "Create your first secret to get started",
          });
        } else {
          showToast({
            style: Toast.Style.Success,
            title: "Secrets loaded",
            message: `Found ${secretsData.length} secret${secretsData.length === 1 ? "" : "s"}`,
          });
        }
      } catch (error) {
        (await loadingToast).hide();
        console.error("Failed to load secrets:", error);
        showFailureToast({
          title: "Failed to load secrets",
          message: error instanceof Error ? error.message : "Unknown error occurred",
        });
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
  }, [projectId, gcloudPath]);

  useEffect(() => {
    if (!searchText) {
      setFilteredSecrets(secrets);
    } else {
      const filtered = secrets.filter((secret) => {
        const secretId = SecretManagerService.extractSecretId(secret.name);
        const labelValues = secret.labels ? Object.values(secret.labels).join(" ") : "";
        return (
          secretId.toLowerCase().includes(searchText.toLowerCase()) ||
          labelValues.toLowerCase().includes(searchText.toLowerCase())
        );
      });
      setFilteredSecrets(filtered);
    }
  }, [searchText, secrets]);

  const refreshSecrets = async () => {
    if (!service) return;

    setIsLoading(true);
    try {
      const secretsData = await service.listSecrets(false); // Force refresh
      setSecrets(secretsData);
      setFilteredSecrets(secretsData);
      showToast({
        style: Toast.Style.Success,
        title: "Secrets refreshed",
        message: `Found ${secretsData.length} secret${secretsData.length === 1 ? "" : "s"}`,
      });
    } catch (error) {
      showFailureToast({
        title: "Failed to refresh secrets",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSecret = async (secret: Secret) => {
    if (!service) return;

    const secretId = SecretManagerService.extractSecretId(secret.name);

    const confirmed = await confirmAlert({
      title: "Delete Secret",
      message: `Are you sure you want to delete the secret "${secretId}"? This action cannot be undone.`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      const success = await service.deleteSecret(secretId);
      if (success) {
        showToast({
          style: Toast.Style.Success,
          title: "Secret deleted",
          message: `Secret "${secretId}" has been deleted`,
        });
        await refreshSecrets();
      }
    }
  };

  const handleQuickCopyValue = async (secret: Secret) => {
    if (!service) return;

    const secretId = SecretManagerService.extractSecretId(secret.name);

    const confirmed = await confirmAlert({
      title: "Copy Secret Value",
      message: `This will copy the latest value of "${secretId}" to your clipboard. Are you sure?`,
      primaryAction: {
        title: "Copy Value",
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
        const value = await service.accessVersion(secretId, "latest");
        (await loadingToast).hide();

        if (value) {
          await Clipboard.copy(value);
          showToast({
            style: Toast.Style.Success,
            title: "Value copied",
            message: "Secret value has been copied to clipboard",
          });

          // Auto-clear clipboard after 30 seconds for security
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

  const handleViewDetails = (secret: Secret) => {
    const secretId = SecretManagerService.extractSecretId(secret.name);
    push(<SecretDetailView secretId={secretId} projectId={projectId} gcloudPath={gcloudPath} />);
  };

  const handleCreateSecret = () => {
    push(<CreateSecretForm projectId={projectId} gcloudPath={gcloudPath} onSecretCreated={refreshSecrets} />);
  };

  const getSecretIcon = (secret: Secret): { source: Icon; tintColor?: Color } => {
    if (secret.expireTime) {
      const expireDate = new Date(secret.expireTime);
      const now = new Date();
      if (expireDate < now) {
        return { source: Icon.Clock, tintColor: Color.Red };
      } else if (expireDate.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000) {
        return { source: Icon.Clock, tintColor: Color.Orange };
      }
    }
    return { source: Icon.Lock, tintColor: Color.Green };
  };

  const getSecretSubtitle = (secret: Secret): string => {
    const parts: string[] = [];

    // Add creation time
    parts.push(`Created ${SecretManagerService.formatRelativeTime(secret.createTime)}`);

    // Add expiration if exists
    if (secret.expireTime) {
      const expireDate = new Date(secret.expireTime);
      const now = new Date();
      if (expireDate < now) {
        parts.push("Expired");
      } else {
        parts.push(`Expires ${SecretManagerService.formatRelativeTime(secret.expireTime)}`);
      }
    }

    return parts.join(" • ");
  };

  const getSecretAccessories = (secret: Secret): List.Item.Accessory[] => {
    const accessories: List.Item.Accessory[] = [];

    // Show labels if any
    if (secret.labels && Object.keys(secret.labels).length > 0) {
      accessories.push({
        icon: Icon.Tag,
        tooltip: `Labels: ${Object.entries(secret.labels)
          .map(([key, value]) => `${key}=${value}`)
          .join(", ")}`,
      });
    }

    // Show rotation if configured
    if (secret.rotation) {
      accessories.push({
        icon: Icon.ArrowClockwise,
        tooltip: "Automatic rotation enabled",
      });
    }

    return accessories;
  };

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search secrets by name or labels..."
      searchBarAccessory={<QuickProjectSwitcher gcloudPath={gcloudPath} onProjectSelect={onProjectChange} />}
      actions={
        <ActionPanel>
          <Action title="Create Secret" icon={Icon.Plus} onAction={handleCreateSecret} />
          <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={refreshSecrets} />
        </ActionPanel>
      }
    >
      {filteredSecrets.length === 0 ? (
        <List.EmptyView
          icon={Icon.Lock}
          title={isLoading ? "Loading secrets..." : secrets.length === 0 ? "No secrets found" : "No matching secrets"}
          description={
            isLoading
              ? "Please wait while we fetch your secrets"
              : secrets.length === 0
                ? "Create your first secret to get started"
                : "Try adjusting your search terms"
          }
          actions={
            <ActionPanel>
              <Action title="Create Secret" icon={Icon.Plus} onAction={handleCreateSecret} />
              {!isLoading && <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={refreshSecrets} />}
            </ActionPanel>
          }
        />
      ) : (
        filteredSecrets.map((secret) => {
          const secretId = SecretManagerService.extractSecretId(secret.name);
          return (
            <List.Item
              key={secret.name}
              id={secret.name}
              title={secretId}
              subtitle={getSecretSubtitle(secret)}
              icon={getSecretIcon(secret)}
              accessories={getSecretAccessories(secret)}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Secret Actions">
                    <Action title="View Details" icon={Icon.Eye} onAction={() => handleViewDetails(secret)} />
                    <Action
                      title="Copy Latest Value"
                      icon={Icon.Clipboard}
                      onAction={() => handleQuickCopyValue(secret)}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Management">
                    <Action
                      title="Create New Secret"
                      icon={Icon.Plus}
                      onAction={handleCreateSecret}
                      shortcut={{ modifiers: ["cmd"], key: "n" }}
                    />
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      onAction={refreshSecrets}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Danger Zone">
                    <Action
                      title="Delete Secret"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={() => handleDeleteSecret(secret)}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
