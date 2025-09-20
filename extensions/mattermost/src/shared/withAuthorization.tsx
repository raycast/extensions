import { Icon, Toast, List, showToast, openExtensionPreferences } from "@raycast/api";
import { ReactNode } from "react";
import { MattermostClient } from "./MattermostClient";
import { showFailureToast, usePromise } from "@raycast/utils";

export function withAuthorization(children: ReactNode) {
  const {
    isLoading,
    data: authorized,
    error,
  } = usePromise(
    async () => {
      const wakeUp = await MattermostClient.wakeUpSession();
      if (wakeUp) return true;

      await showToast(Toast.Style.Animated, "Authorize...");
      await MattermostClient.login();
      return true;
    },
    [],
    {
      async onData() {
        await showToast(Toast.Style.Success, "Authorized");
      },
      async onError(error) {
        await showFailureToast(error.message, {
          title: "Authorization failed",
          primaryAction: {
            title: "Open Extension Preferences",
            async onAction() {
              await openExtensionPreferences();
            },
          },
        });
      },
    },
  );

  if (!authorized) {
    return (
      <List isLoading={isLoading}>
        {error && (
          <List.EmptyView title="Authorization failed" description={error.message} icon={Icon.XMarkCircleFilled} />
        )}
      </List>
    );
  }

  return children;
}
