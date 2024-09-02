import { useFetch } from "@raycast/utils";
import preferences from "../utils/preferences";
import { DocsResponse } from "../types/docs.dt";

export default function useDocs(workspaceId: string) {
  const { isLoading, data } = useFetch(`https://api.clickup.com/api/v3/workspaces/${workspaceId}/docs`, {
    headers: {
      Authorization: preferences.token,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    mapResult(result: DocsResponse) {
      return {
        data: result.docs,
      };
    },
    initialData: [],
  });
  return { isLoading, data };
}
