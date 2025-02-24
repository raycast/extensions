/* eslint-disable @raycast/prefer-title-case */
import { List } from "@raycast/api";
import { memo } from "react";
import useAuth from "./hooks/use-auth";
import LegacyClients from "./legacy/clients";
import AuthPrompt from "./prompts/auth-prompt";
import ModernClientsView from "./commands/view-clients";
import LegacyPrompt from "./prompts/legacy-prompt";

function ViewClients(props: { arguments: { search?: string } }) {
  const { isAuthenticated, isLoading, isLegacy, hasSeenLegacyPrompt, markLegacyPromptAsSeen } = useAuth();

  if (isLoading) {
    return <List isLoading={true} />;
  }

  if (!isAuthenticated) {
    return <AuthPrompt />;
  }

  if (isLegacy && !hasSeenLegacyPrompt) {
    return <LegacyPrompt onDismiss={markLegacyPromptAsSeen} />;
  }

  if (isLegacy) {
    return <LegacyClients />;
  }

  return <ModernClientsView arguments={props.arguments} />;
}

export default memo(ViewClients);
