/* eslint-disable @raycast/prefer-title-case */
import { List, type LaunchProps } from "@raycast/api";
import LegacyDevices from "./legacy/devices";
import ViewDevicesNew from "./commands/view-devices";
import useAuth from "./hooks/use-auth";
import LegacyPrompt from "./prompts/legacy-prompt";
import AuthPrompt from "./prompts/auth-prompt";

function ViewDevices(props: LaunchProps) {
  const { isAuthenticated, isLegacy, isLoading, markLegacyPromptAsSeen, hasSeenLegacyPrompt } = useAuth();

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
    return <LegacyDevices />;
  }

  return <ViewDevicesNew {...props} />;
}

export default ViewDevices;
