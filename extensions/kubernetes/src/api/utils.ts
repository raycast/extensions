import { KubernetesListObject, KubernetesObject } from "@kubernetes/client-node";
import { showToast, Toast } from "@raycast/api";

export async function listResources<T extends KubernetesObject>(
  apiCall: () => Promise<KubernetesListObject<T>>,
  apiVersion: string,
  kind: string,
): Promise<T[]> {
  try {
    const resp = await apiCall();
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
}
