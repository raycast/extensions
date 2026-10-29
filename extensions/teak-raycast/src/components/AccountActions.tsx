import { ActionPanel } from "@raycast/api";
import { SetApiKeyAction } from "./SetApiKeyAction";
import { SignOutAction } from "./SignOutAction";

interface AccountActionsProps {
  onSignedOut?: () => void;
}

/** The last section of every action panel: the API key preference and Sign Out. */
export function AccountActions({ onSignedOut }: AccountActionsProps) {
  return (
    <ActionPanel.Section title="Account">
      <SetApiKeyAction />
      <SignOutAction onSignedOut={onSignedOut} />
    </ActionPanel.Section>
  );
}
