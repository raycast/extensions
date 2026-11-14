import { usePromise } from "@raycast/utils";
import { savedOutputs } from "../lib/history";

export const useSavedOutputs = () => {
  const { data, revalidate } = usePromise(savedOutputs);
  return { saved: data ?? {}, revalidate };
};
