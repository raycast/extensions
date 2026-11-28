import { ActionPanel } from "@raycast/api";
import { SetApiKeyAction } from "./SetApiKeyAction";
import { SignOutAction } from "./SignOutAction";

interface AccountActionsProps {
  beforeSignOut?: () => Promise<unknown>;
  onSignedOut?: () => void;
}

export function AccountActions({
  beforeSignOut,
  onSignedOut,
}: AccountActionsProps) {
  return (
    <ActionPanel.Section title="Account">
      <SetApiKeyAction />
      <SignOutAction beforeSignOut={beforeSignOut} onSignedOut={onSignedOut} />
    </ActionPanel.Section>
  );
}
