import { KubernetesObject, KubernetesObjectApi } from "@kubernetes/client-node";
import { showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useKubernetesContext } from "../states/context";
import { useKubernetesNamespace } from "../states/namespace";

export default function useKubernetesResources<T extends KubernetesObject>(
  apiVersion: string,
  kind: string,
  namespace?: string,
  labelSelector?: string,
) {
  const { apiClient } = useKubernetesContext();
  const { currentNamespace } = useKubernetesNamespace();

  const listingNamespace = namespace ?? currentNamespace;

  const { isLoading, data } = usePromise(
    async (apiClient: KubernetesObjectApi, namespace: string, labelSelector?: string) => {
      try {
        const resp = await apiClient.list<T>(
          apiVersion,
          kind,
          namespace,
          undefined,
          undefined,
          undefined,
          undefined,
          labelSelector,
        );
        return resp.items;
      } catch (error) {
        console.error(`Failed to list ${apiVersion}/${kind}:`, error);
        await showToast({
          style: Toast.Style.Failure,
          title: `Failed to list ${apiVersion}/${kind}`,
          message: `${error}`,
        });
        return [];
      }
    },
    [apiClient, listingNamespace, labelSelector],
  );

  return { isLoading, data };
}
