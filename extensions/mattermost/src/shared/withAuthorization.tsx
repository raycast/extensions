import { Icon, Toast, List, showToast } from "@raycast/api";
import { ReactNode, useEffect, useState } from "react";
import { MattermostClient } from "./MattermostClient";

export function withAuthorization(children: ReactNode) {
  const [authorized, setAuthorized] = useState<boolean | Error>(false);

  useEffect(() => {
    (async () => {
      setAuthorized(await MattermostClient.wakeUpSession());
      showToast(Toast.Style.Animated, "Authorize...");

      try {
        await MattermostClient.login();
        setAuthorized(true);
      } catch (error) {
        showToast(Toast.Style.Failure, `Authorization failed: ${error}`);
        setAuthorized(error as Error);
      }

      showToast(Toast.Style.Success, "Authorized");
    })();
  }, []);

  if (authorized !== true) {
    return (
      <List isLoading={authorized == false}>
        {authorized instanceof Error && <List.EmptyView title={authorized.message} icon={Icon.XMarkCircleFilled} />}
      </List>
    );
  }

  return children;
}
