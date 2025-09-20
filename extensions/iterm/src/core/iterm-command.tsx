import { closeMainWindow, popToRoot } from "@raycast/api";
import { ItermCommandOpts, useItermCommand } from "./use-iterm-command";
import { PermissionErrorScreen, isPermissionError } from "./permission-error-screen";
import { ErrorToast } from "./error-toast";
import { FunctionComponent, useEffect } from "react";
import { LoadingToast } from "./loading-toast";

interface Props extends ItermCommandOpts {
  loadingMessage?: string;
}

export const ItermCommand: FunctionComponent<Props> = ({
  loadingMessage = "Sending iTerm command...",
  // default to new-window to avoid sending text to a random background window
  location = "new-window",
  ...commandOpts
}) => {
  const { loading, success, error } = useItermCommand({
    ...commandOpts,
    location,
  });

  useEffect(() => {
    if (success) {
      (async () => {
        await closeMainWindow();
        await popToRoot();
      })();
    }
  }, [success]);

  if (loading) return <LoadingToast message={loadingMessage} />;
  if (error) return isPermissionError(error.message) ? <PermissionErrorScreen /> : <ErrorToast error={error} />;
  return null;
};
