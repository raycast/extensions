import { useExec } from "@raycast/utils";
import { useMemo } from "react";

export function useLanguages() {
  const { data, isLoading } = useExec(
    "defaults read com.apple.HIToolbox AppleEnabledInputSources | grep 'KeyboardLayout Name' | awk -F'= ' '{print $2}' | tr -d '\";'",
    {
      shell: true,
      keepPreviousData: true,
    },
  );

  const languages = useMemo<string[]>(() => {
    return data
      ? data
          .split("\n")
          .map((line) => line.trim().replaceAll(/["(),]/g, ""))
          .filter((line) => line.length > 0)
      : [];
  }, [data]);

  return {
    value: languages,
    isLoading,
  };
}

export function useCurrentLanguage() {
  const { data, isLoading } = useExec(
    "defaults read com.apple.HIToolbox AppleSelectedInputSources | grep 'KeyboardLayout Name' | awk -F'= ' '{print $2}' | tr -d '\";'",
    {
      shell: true,
      keepPreviousData: true,
    },
  );

  return {
    value: data,
    isLoading,
  };
}
