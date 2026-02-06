import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { AccountGuard } from "./AccountGuard";
import { useActiveAccount } from "../lib/hooks/useActiveAccount";
import { isFeatureEnabled, FEATURE_LABELS } from "../lib/features";
import type { FeatureKey } from "../lib/features";

interface FeatureGuardProps {
  feature: FeatureKey;
  children: (apiKey: string, accountName: string) => React.ReactNode;
}

export function FeatureGuard({ feature, children }: FeatureGuardProps) {
  return (
    <AccountGuard>
      {(apiKey, accountName) => (
        <FeatureCheck
          feature={feature}
          apiKey={apiKey}
          accountName={accountName}
        >
          {children}
        </FeatureCheck>
      )}
    </AccountGuard>
  );
}

interface FeatureCheckProps {
  feature: FeatureKey;
  apiKey: string;
  accountName: string;
  children: (apiKey: string, accountName: string) => React.ReactNode;
}

function FeatureCheck({
  feature,
  apiKey,
  accountName,
  children,
}: FeatureCheckProps) {
  const { activeAccount } = useActiveAccount();

  const enabled = isFeatureEnabled(activeAccount?.capabilities, feature);

  if (enabled) {
    return <>{children(apiKey, accountName)}</>;
  }

  const label = FEATURE_LABELS[feature];
  const isApiRestriction =
    activeAccount?.capabilities?.detected[feature] === false;

  const markdown = isApiRestriction
    ? `# ${label} Unavailable\n\nYour Mercury API key does not have access to **${label}**. This may be due to your account type or API token permissions.\n\nGenerate a new token with broader permissions from your Mercury Dashboard.`
    : `# ${label} Disabled\n\n**${label}** has been disabled in your account settings.\n\nRe-enable it in **Manage Mercury Accounts** → **Feature Settings**.`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open Mercury Dashboard"
            icon={Icon.Globe}
            url="https://app.mercury.com"
          />
        </ActionPanel>
      }
    />
  );
}