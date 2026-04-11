import { Action, ActionPanel, Color, Icon, List, showToast, Toast, confirmAlert, Alert } from "@raycast/api";
import { useState } from "react";
import { useFeatureFlags, FeatureFlag, toggleFeatureFlag, FeatureFlagsConfig } from "../../hooks/use-appconfig";

interface Props {
  applicationId: string;
  applicationName: string;
  configurationProfileId: string;
  configurationProfileName: string;
  environmentId: string;
  environmentName: string;
}

export function AppConfigFlags({
  applicationId,
  applicationName,
  configurationProfileId,
  configurationProfileName,
  environmentId,
  environmentName,
}: Props) {
  const [isShowingDetail, setIsShowingDetail] = useState(false);
  const { flags, rawConfig, error, isLoading, revalidate } = useFeatureFlags(
    applicationId,
    environmentId,
    configurationProfileId,
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetail}
      navigationTitle={`${applicationName} - ${configurationProfileName} (${environmentName})`}
      searchBarPlaceholder="Filter flags by name..."
    >
      {error ? (
        <List.EmptyView
          title={error.name}
          description={error.message}
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
        />
      ) : flags.length === 0 ? (
        <List.EmptyView
          title="No feature flags configured"
          icon={{ source: Icon.AppWindowList, tintColor: Color.Orange }}
        />
      ) : (
        flags.map((flag) => (
          <FeatureFlagItem
            key={flag.key}
            flag={flag}
            rawConfig={rawConfig}
            applicationId={applicationId}
            configurationProfileId={configurationProfileId}
            environmentId={environmentId}
            isShowingDetail={isShowingDetail}
            onToggleDetail={() => setIsShowingDetail(!isShowingDetail)}
            revalidate={revalidate}
          />
        ))
      )}
    </List>
  );
}

function FeatureFlagItem({
  flag,
  rawConfig,
  applicationId,
  configurationProfileId,
  environmentId,
  isShowingDetail,
  onToggleDetail,
  revalidate,
}: {
  flag: FeatureFlag;
  rawConfig: FeatureFlagsConfig | null;
  applicationId: string;
  configurationProfileId: string;
  environmentId: string;
  isShowingDetail: boolean;
  onToggleDetail: () => void;
  revalidate: () => void;
}) {
  const AWS_REGION = process.env.AWS_REGION;
  const variantCount = flag.variants ? Object.keys(flag.variants).length : 0;

  const handleToggle = async () => {
    if (!rawConfig) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Cannot toggle flag",
        message: "Configuration not loaded",
      });
      return;
    }

    const action = flag.enabled ? "Disable" : "Enable";
    const confirmed = await confirmAlert({
      title: `${action} Feature Flag`,
      message: `Are you sure you want to ${action.toLowerCase()} "${flag.name}"?`,
      primaryAction: {
        title: action,
        style: flag.enabled ? Alert.ActionStyle.Destructive : Alert.ActionStyle.Default,
      },
    });

    if (!confirmed) return;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `${action === "Enable" ? "Enabling" : "Disabling"} flag...`,
    });

    try {
      await toggleFeatureFlag(applicationId, configurationProfileId, environmentId, flag.key, rawConfig, !flag.enabled);

      toast.style = Toast.Style.Success;
      toast.title = `Flag ${action.toLowerCase()}d`;
      toast.message = flag.name;

      revalidate();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = `Failed to ${action.toLowerCase()} flag`;
      toast.message = error instanceof Error ? error.message : "Unknown error";
    }
  };

  return (
    <List.Item
      key={flag.key}
      title={flag.name}
      subtitle={flag.description || ""}
      icon={
        flag.enabled
          ? { source: Icon.CheckCircle, tintColor: Color.Green }
          : { source: Icon.XMarkCircle, tintColor: Color.Red }
      }
      detail={
        isShowingDetail ? (
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Key" text={flag.key} />
                <List.Item.Detail.Metadata.Label title="Name" text={flag.name} />
                <List.Item.Detail.Metadata.Label
                  title="Status"
                  text={flag.enabled ? "Enabled" : "Disabled"}
                  icon={flag.enabled ? Icon.CheckCircle : Icon.XMarkCircle}
                />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="Description" text={flag.description || "-"} />
                {variantCount > 0 && (
                  <>
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Variants" text={`${variantCount} variant(s)`} />
                  </>
                )}
                {flag.constraints && flag.constraints.length > 0 && (
                  <>
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Constraints"
                      text={`${flag.constraints.length} constraint(s)`}
                    />
                  </>
                )}
              </List.Item.Detail.Metadata>
            }
          />
        ) : undefined
      }
      actions={
        <ActionPanel>
          <Action
            title={flag.enabled ? "Disable Flag" : "Enable Flag"}
            icon={flag.enabled ? Icon.XMarkCircle : Icon.CheckCircle}
            shortcut={{ modifiers: ["cmd"], key: "t" }}
            onAction={handleToggle}
          />
          <Action.CopyToClipboard
            title="Copy Flag Key"
            content={flag.key}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action.CopyToClipboard
            title="Copy Flag as JSON"
            content={JSON.stringify(flag, null, 2)}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <Action.OpenInBrowser
            title="Open in AWS Console"
            url={`https://${AWS_REGION}.console.aws.amazon.com/systems-manager/appconfig/applications/${applicationId}/configurationprofiles/${configurationProfileId}?region=${AWS_REGION}`}
          />
          <Action
            title={isShowingDetail ? "Hide Details" : "Show Details"}
            icon={Icon.Sidebar}
            shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
            onAction={onToggleDetail}
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={revalidate}
          />
        </ActionPanel>
      }
      accessories={[
        { tag: { value: flag.enabled ? "Enabled" : "Disabled", color: flag.enabled ? Color.Green : Color.Red } },
        ...(variantCount > 0 ? [{ text: `${variantCount} variants` }] : []),
      ]}
    />
  );
}
