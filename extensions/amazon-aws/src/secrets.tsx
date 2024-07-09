import { Action, ActionPanel, Color, Image, Icon, Keyboard, List } from "@raycast/api";
import { useCachedState, useFrecencySorting } from "@raycast/utils";
import { useState } from "react";
import AWSProfileDropdown from "./components/searchbar/aws-profile-dropdown";
import { resourceToConsoleLink } from "./util";
import { AwsAction } from "./components/common/action";
import { useSecrets } from "./hooks/use-secrets";
import { SecretValueDetails } from "./components/secrets/secret-value-details";
import { SecretListEntry } from "@aws-sdk/client-secrets-manager";
import { SecretPolicyDetails } from "./components/secrets/secret-policy-details";
import { SecretCopyActions } from "./components/secrets/common-components";

export default function Secrets() {
  const [search, setSearch] = useState<string>("");
  const [isDetailsEnabled, setDetailsEnabled] = useCachedState<boolean>("show-details", false, {
    cacheNamespace: "aws-secrets",
  });
  const { secrets, error, isLoading, mutate } = useSecrets(search);

  const {
    data: sortedSecrets,
    resetRanking,
    visitItem: visit,
  } = useFrecencySorting(secrets, {
    namespace: "aws-secrets-sort",
    key: (secret: SecretListEntry) => secret.ARN!,
    sortUnvisited: (a, b) => a.Name!.localeCompare(b.Name!),
  });

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={!isLoading && !error && (secrets || []).length > 0 && isDetailsEnabled}
      searchBarPlaceholder="Filter secrets by name prefix (>2 characters)"
      searchBarAccessory={<AWSProfileDropdown onProfileSelected={mutate} />}
      onSearchTextChange={setSearch}
      throttle
    >
      {error && (
        <List.EmptyView
          title={error.name}
          description={error.message}
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
        />
      )}
      {!error && secrets?.length === 0 && (
        <List.EmptyView title="No secrets found!" icon={{ source: Icon.Warning, tintColor: Color.Orange }} />
      )}
      {sortedSecrets.map((secret) => (
        <List.Item
          key={secret.ARN!}
          icon={{ source: "aws-icons/secretsmanager.png", mask: Image.Mask.RoundedRectangle }}
          title={secret.Name!}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Name" text={secret.Name} />
                  <List.Item.Detail.Metadata.Label title="Description" text={secret.Description} />
                  {secret.PrimaryRegion && (
                    <List.Item.Detail.Metadata.Label title="Primary Region" text={secret.PrimaryRegion} />
                  )}
                  {secret.OwningService && (
                    <List.Item.Detail.Metadata.Label title="Owning Service" text={secret.OwningService} />
                  )}
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="Creation Date"
                    text={secret.CreatedDate?.toISOString()}
                    icon={Icon.Calendar}
                  />
                  {secret.LastAccessedDate && (
                    <List.Item.Detail.Metadata.Label
                      title="Last Accessed"
                      text={secret.LastAccessedDate?.toISOString()}
                      icon={Icon.Calendar}
                    />
                  )}
                  {secret.LastRotatedDate && (
                    <List.Item.Detail.Metadata.Label
                      title="Last Rotated"
                      text={secret.LastRotatedDate?.toISOString()}
                      icon={Icon.Calendar}
                    />
                  )}
                  {secret.LastChangedDate && (
                    <List.Item.Detail.Metadata.Label
                      title="Last Changed"
                      text={secret.LastChangedDate?.toISOString()}
                      icon={Icon.Calendar}
                    />
                  )}
                  {secret.DeletedDate && (
                    <List.Item.Detail.Metadata.Label
                      title="Deleted"
                      text={secret.DeletedDate?.toISOString()}
                      icon={Icon.Calendar}
                    />
                  )}
                  <List.Item.Detail.Metadata.Separator />
                  {secret.SecretVersionsToStages &&
                    Object.keys(secret.SecretVersionsToStages).map((version) => (
                      <List.Item.Detail.Metadata.TagList title={version} key={version}>
                        {(secret.SecretVersionsToStages?.[version] ?? []).map((stage: string) => (
                          <List.Item.Detail.Metadata.TagList.Item
                            text={stage}
                            icon={Icon.Tag}
                            color={Color.Orange}
                            key={`${version}-${stage}`}
                          />
                        ))}
                      </List.Item.Detail.Metadata.TagList>
                    ))}
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="Rotation"
                    icon={
                      secret.RotationEnabled
                        ? { source: Icon.Checkmark, tintColor: Color.Green }
                        : { source: Icon.Xmark, tintColor: Color.Red }
                    }
                  />
                  {secret.RotationRules?.Duration && (
                    <List.Item.Detail.Metadata.Label
                      title="Rotation Duration"
                      text={secret.RotationRules.Duration}
                      icon={{ source: Icon.Clock, tintColor: Color.Blue }}
                    />
                  )}
                  {secret.RotationRules?.AutomaticallyAfterDays && (
                    <List.Item.Detail.Metadata.Label
                      title="Rotation After Days"
                      text={`${secret.RotationRules.AutomaticallyAfterDays}`}
                      icon={{ source: Icon.Clock, tintColor: Color.Blue }}
                    />
                  )}
                  {secret.RotationRules?.ScheduleExpression && (
                    <List.Item.Detail.Metadata.Label
                      title="Rotation Schedule"
                      text={secret.RotationRules.ScheduleExpression}
                      icon={{ source: Icon.Clock, tintColor: Color.Blue }}
                    />
                  )}
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <AwsAction.Console
                url={resourceToConsoleLink(secret.Name, "AWS::SecretsManager::Secret")}
                onAction={() => visit(secret)}
              />
              <ActionPanel.Section title={"Secret Actions"}>
                <Action.Push
                  target={<SecretValueDetails {...{ secret }} />}
                  title={"Show Secret Value"}
                  icon={Icon.LockUnlocked}
                  shortcut={Keyboard.Shortcut.Common.Open}
                  onPush={() => visit(secret)}
                />
                <Action.Push
                  target={<SecretPolicyDetails {...{ secret }} />}
                  title={"Show Secret Policy"}
                  icon={Icon.Key}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                  onPush={() => visit(secret)}
                />
                <SecretCopyActions {...{ secret, visit }} />
                <Action
                  title={`${isDetailsEnabled ? "Hide" : "Show"} Details`}
                  onAction={() => setDetailsEnabled(!isDetailsEnabled)}
                  icon={isDetailsEnabled ? Icon.EyeDisabled : Icon.Eye}
                />
                <Action title="Reset Ranking" icon={Icon.ArrowCounterClockwise} onAction={() => resetRanking(secret)} />
              </ActionPanel.Section>
            </ActionPanel>
          }
          accessories={[
            {
              date: secret.LastAccessedDate ?? secret.LastChangedDate,
              tooltip: secret.LastAccessedDate ? "Last Accessed" : "Last Changed",
              icon: Icon.Calendar,
            },
            {
              icon: secret.RotationEnabled
                ? { source: Icon.Checkmark, tintColor: Color.Green }
                : { source: Icon.Warning, tintColor: Color.Orange },
              tooltip: secret.RotationEnabled ? "Rotation Enabled" : "Rotation Disabled",
            },
          ]}
        />
      ))}
    </List>
  );
}
