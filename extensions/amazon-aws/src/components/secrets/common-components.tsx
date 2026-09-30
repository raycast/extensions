import { SecretListEntry } from "@aws-sdk/client-secrets-manager";
import { Action, Color, Detail, Icon } from "@raycast/api";

export type SecretProps = {
  secret: SecretListEntry;
  visit?: (secret: SecretListEntry) => void;
};

export const SecretDetailsMetadata = ({ secret }: { secret: SecretListEntry }) => (
  <Detail.Metadata>
    <Detail.Metadata.Label title="Name" text={secret.Name} />
    <Detail.Metadata.Label title="Description" text={secret.Description} />
    {secret.PrimaryRegion && <Detail.Metadata.Label title="Primary Region" text={secret.PrimaryRegion} />}
    {secret.OwningService && <Detail.Metadata.Label title="Owning Service" text={secret.OwningService} />}
    <Detail.Metadata.Separator />
    <Detail.Metadata.Label title="Creation Date" text={secret.CreatedDate?.toISOString()} icon={Icon.Calendar} />
    {secret.LastAccessedDate && (
      <Detail.Metadata.Label title="Last Accessed" text={secret.LastAccessedDate?.toISOString()} icon={Icon.Calendar} />
    )}
    {secret.LastRotatedDate && (
      <Detail.Metadata.Label title="Last Rotated" text={secret.LastRotatedDate?.toISOString()} icon={Icon.Calendar} />
    )}
    {secret.LastChangedDate && (
      <Detail.Metadata.Label title="Last Changed" text={secret.LastChangedDate?.toISOString()} icon={Icon.Calendar} />
    )}
    {secret.DeletedDate && (
      <Detail.Metadata.Label title="Deleted" text={secret.DeletedDate?.toISOString()} icon={Icon.Calendar} />
    )}
    <Detail.Metadata.Separator />
    <Detail.Metadata.Label
      title="Rotation"
      icon={
        secret.RotationEnabled
          ? { source: Icon.Checkmark, tintColor: Color.Green }
          : { source: Icon.Xmark, tintColor: Color.Red }
      }
    />
    {secret.RotationRules?.Duration && (
      <Detail.Metadata.Label
        title="Rotation Duration"
        text={secret.RotationRules.Duration}
        icon={{ source: Icon.Clock, tintColor: Color.Blue }}
      />
    )}
    {secret.RotationRules?.AutomaticallyAfterDays && (
      <Detail.Metadata.Label
        title="Rotation After Days"
        text={`${secret.RotationRules.AutomaticallyAfterDays}`}
        icon={{ source: Icon.Clock, tintColor: Color.Blue }}
      />
    )}
    {secret.RotationRules?.ScheduleExpression && (
      <Detail.Metadata.Label
        title="Rotation Schedule"
        text={secret.RotationRules.ScheduleExpression}
        icon={{ source: Icon.Clock, tintColor: Color.Blue }}
      />
    )}
  </Detail.Metadata>
);

export const SecretCopyActions = ({ secret, visit }: SecretProps) => (
  <>
    <Action.CopyToClipboard title="Copy Name" content={secret.Name || ""} onCopy={() => visit?.(secret)} />
    <Action.CopyToClipboard title="Copy ARN" content={secret.ARN || ""} onCopy={() => visit?.(secret)} />
  </>
);
