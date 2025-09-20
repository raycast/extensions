import { useSecretPolicy } from "../../hooks/use-secrets";
import { Action, ActionPanel, Detail } from "@raycast/api";
import { AwsAction } from "../common/action";
import { resourceToConsoleLink } from "../../util";
import { SecretCopyActions, SecretDetailsMetadata, SecretProps } from "./common-components";

export const SecretPolicyDetails = ({ secret }: SecretProps) => {
  const { policy, isLoading } = useSecretPolicy(secret.ARN!);

  return (
    <Detail
      markdown={policy?.markdown}
      isLoading={isLoading}
      navigationTitle={"Secret Policy"}
      metadata={<SecretDetailsMetadata secret={secret} />}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Secret Policy" content={policy?.value || ""} />
          <AwsAction.Console url={resourceToConsoleLink(secret.Name, "AWS::SecretsManager::Secret")} />
          <ActionPanel.Section title={"Secret Actions"}>
            <SecretCopyActions {...{ secret }} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};
