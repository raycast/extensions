import { useExec } from "@raycast/utils";

export const useCurrentDate = (): {
  data: string | null;
  isLoading: boolean;
  error: Error | undefined;
} => {
  const { data: rawData, isLoading, error } = useExec("date", ["-I"]);

  let data: string | null = null;

  if (rawData && !error) {
    data = rawData.trim();
  }

  return { data, isLoading, error };
};
