import { usePromise } from "@raycast/utils";
import { getAllFeatureTypes } from "../api";

export const useGetAllFeatureTypes = () => {
  return usePromise(async () => {
    const res = await getAllFeatureTypes();

    return res.types;
  });
};
