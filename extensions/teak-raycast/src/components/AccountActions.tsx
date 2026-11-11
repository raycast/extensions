import { ActionPanel } from "@raycast/api";
import { SetApiKeyAction } from "./SetApiKeyAction";
import { SignOutAction } from "./SignOutAction";

interface AccountActionsProps {
  beforeSignOut?: () => Promise<unknown>;
  onSignedOut?: () => void;
}

/** The last section of every action panel: the API key preference and Sign Out. */
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
