import { usePromise } from "@raycast/utils";
import { getAllFeatures } from "../api";

export const useGetAllFeatures = (projectId: string) => {
  return usePromise(async () => {
    const res = await getAllFeatures(projectId);

    return res.features;
  });
};
