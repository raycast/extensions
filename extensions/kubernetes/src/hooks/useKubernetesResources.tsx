import { KubernetesObject } from "@kubernetes/client-node";
import { showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useKubernetesContext } from "../states/context";
import { useKubernetesNamespace } from "../states/namespace";

export default function useKubernetesResources<T extends KubernetesObject>(apiVersion: string, kind: string) {
  const { apiClient } = useKubernetesContext();
  const { currentNamespace } = useKubernetesNamespace();

  const { isLoading, data } = usePromise(
    async (namespace: string) => {
      try {
        const resp = await apiClient.list<T>(apiVersion, kind, namespace);
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
    [currentNamespace],
  );

  return { isLoading, data };
}
