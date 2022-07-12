import { useNavigation } from "@raycast/api";
import ExpandableErrorToast from "../components/ExpandableErrorToast";

import { Sourcegraph, instanceName } from "../sourcegraph";
import { AuthError, checkAuth } from "../sourcegraph/gql/auth";

/**
 * checkAuthEffect validates connectivity to the given Sourcegraph instance configuration.
 */
export default function checkAuthEffect(src: Sourcegraph) {
  const srcName = instanceName(src);
  const { push } = useNavigation();

  return () => {
    async function checkSrc() {
      try {
        if (src.token) {
          const controller = new AbortController();
          await checkAuth(controller.signal, src);
        }
      } catch (err) {
        const helpText =
          "\n\nThis may be an issue with your configuration - try updating the Sourcegraph extension settings!";
        const toast =
          err instanceof AuthError
            ? ExpandableErrorToast(
                push,
                "Authentication error",
                `Failed to authenticate against ${srcName}`,
                `${err.message}. ${helpText}`
              )
            : ExpandableErrorToast(
                push,
                "Authentication error",
                `Encountered error authenticating against ${srcName}`,
                `${String(err)}. ${helpText}`
              );
        await toast.show();
      }
    }
    checkSrc();
  };
}
