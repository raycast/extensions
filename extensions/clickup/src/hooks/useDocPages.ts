import { useFetch } from "@raycast/utils";
import preferences from "../utils/preferences";
import { DocPageItem } from "../types/doc-pages.dt";

export default function useDocPages(workspaceId: string, docId: string) {
  const { isLoading, data } = useFetch(`https://api.clickup.com/api/v3/workspaces/${workspaceId}/docs/${docId}/pages`, {
    headers: {
      Authorization: preferences.token,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    mapResult(result: DocPageItem[]) {
      return {
        data: result,
      };
    },
    initialData: [],
  });
  return { isLoading, data };
}
