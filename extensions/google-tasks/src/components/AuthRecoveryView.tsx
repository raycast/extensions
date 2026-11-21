import { Action, ActionPanel, Detail, Icon, openExtensionPreferences } from "@raycast/api";
import { AuthorizationErrorDetails } from "../api/oauth";
import SetupGuide from "./SetupGuide";

export default function AuthRecoveryView(props: {
  title: string;
  error: AuthorizationErrorDetails;
  onRetry: () => void;
  onReconnect: () => void;
}) {
  if (props.error.needsPreferences) {
    return <SetupGuide title={props.title} message={props.error.message} onRetry={props.onRetry} />;
  }

  return (
    <Detail
      navigationTitle={props.title}
      markdown={`## Connect Google Tasks\n\n${props.error.message}\n\nChoose Retry to try again, or reconnect your Google account if the saved sign-in has expired.`}
      actions={
        <ActionPanel>
          <Action title="Retry" icon={Icon.ArrowClockwise} onAction={props.onRetry} />
          <Action title="Reconnect Google Account" icon={Icon.PersonCircle} onAction={props.onReconnect} />
          <Action
            title="Open Extension Preferences"
            icon={Icon.Gear}
            onAction={() => void openExtensionPreferences()}
          />
        </ActionPanel>
      }
    />
  );
}
