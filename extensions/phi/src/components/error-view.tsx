import { Action, ActionPanel, Detail, Icon, open } from "@raycast/api";
import { PhiError } from "../types";

interface Props {
  error: Error;
  onRetry: () => void;
}

export function PhiErrorView({ error, onRetry }: Props) {
  const phiError =
    error instanceof PhiError
      ? error
      : new PhiError("unknown", error.message, error);
  const permissionDenied = phiError.kind === "permissionDenied";
  const minimumVersionNotMet = phiError.kind === "minimumVersionNotMet";

  return (
    <Detail
      markdown={`# ${minimumVersionNotMet ? "Update Phi" : "Could Not Connect to Phi"}\n\n${phiError.message}`}
      actions={
        <ActionPanel>
          <Action
            title="Try Again"
            icon={Icon.ArrowClockwise}
            onAction={onRetry}
          />
          {permissionDenied ? (
            <Action
              title="Open Automation Settings"
              icon={Icon.Gear}
              onAction={() =>
                open(
                  "x-apple.systempreferences:com.apple.preference.security?Privacy_Automation",
                )
              }
            />
          ) : null}
        </ActionPanel>
      }
    />
  );
}
