import { ToastStyle, Detail, Toast, Navigation } from "@raycast/api";

import { Sourcegraph, instanceName } from "../sourcegraph";
import { AuthError, checkAuth } from "../sourcegraph/gql";

export default function checkAuthEffect(src: Sourcegraph, { push }: Navigation) {
  const srcName = instanceName(src);

  return () => {
    async function checkSrc() {
      try {
        if (src.token) {
          const controller = new AbortController();
          await checkAuth(controller.signal, src);
        }
      } catch (err) {
        const toast =
          err instanceof AuthError
            ? new Toast({
                title: `Failed to authenticate against ${srcName}`,
                message: err.message,
                style: ToastStyle.Failure,
              })
            : new Toast({
                title: `Error authenticating against ${srcName}`,
                message: JSON.stringify(err),
                style: ToastStyle.Failure,
              });
        toast.primaryAction = {
          title: "View details",
          onAction: () => {
            push(
              <Detail
                navigationTitle="Error"
                markdown={`**${toast.title}:** ${toast.message}.

This may be an issue with your configuration - try updating the Sourcegraph extension settings!`}
              />
            );
          },
        };
        await toast.show();
      }
    }
    checkSrc();
  };
}
