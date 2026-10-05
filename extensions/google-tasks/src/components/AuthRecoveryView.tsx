import { Action, ActionPanel, Detail, Icon, openExtensionPreferences } from "@raycast/api";
import { AuthorizationErrorDetails } from "../api/oauth";

export default function AuthRecoveryView(props: {
  title: string;
  error: AuthorizationErrorDetails;
  onRetry: () => void;
  onReconnect: () => void;
}) {
  const instructions = props.error.needsPreferences
    ? "Open Extension Preferences, add your Google OAuth Client ID, then choose Retry."
    : "Choose Retry to try again, or reconnect your Google account if the saved sign-in has expired.";

  return (
    <Detail
      navigationTitle={props.title}
      markdown={`## Connect Google Tasks\n\n${props.error.message}\n\n${instructions}`}
      actions={
        <ActionPanel>
          {props.error.needsPreferences ? (
            <Action
              title="Open Extension Preferences"
              icon={Icon.Gear}
              onAction={() => void openExtensionPreferences()}
            />
          ) : null}
          <Action title="Retry" icon={Icon.ArrowClockwise} onAction={props.onRetry} />
          {!props.error.needsPreferences ? (
            <>
              <Action title="Reconnect Google Account" icon={Icon.PersonCircle} onAction={props.onReconnect} />
              <Action
                title="Open Extension Preferences"
                icon={Icon.Gear}
                onAction={() => void openExtensionPreferences()}
              />
            </>
          ) : null}
        </ActionPanel>
      }
    />
  );
}
