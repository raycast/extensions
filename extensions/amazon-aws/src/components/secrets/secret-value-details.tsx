import { useSecretValue } from "../../hooks/use-secrets";
import { Action, ActionPanel, Detail } from "@raycast/api";
import { AwsAction } from "../common/action";
import { resourceToConsoleLink } from "../../util";
import { SecretCopyActions, SecretDetailsMetadata, SecretProps } from "./common-components";

export const SecretValueDetails = ({ secret }: SecretProps) => {
  const { secret: sec, isLoading } = useSecretValue(secret.ARN!);

  return (
    <Detail
      markdown={sec?.markdown}
      isLoading={isLoading}
      navigationTitle={"Secret Value"}
      metadata={<SecretDetailsMetadata secret={secret} />}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Secret Value" content={sec?.value || ""} />
          <AwsAction.Console url={resourceToConsoleLink(secret.Name, "AWS::SecretsManager::Secret")} />
          <ActionPanel.Section title={"Secret Actions"}>
            <SecretCopyActions {...{ secret }} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};
