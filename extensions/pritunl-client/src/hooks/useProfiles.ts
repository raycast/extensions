import { useExec } from "@raycast/utils";
import { APPLICATION_PATH } from "../constants";
import { useMemo } from "react";
import { Profile } from "../types";

export const useProfiles = () => {
  const { isLoading, data, revalidate } = useExec(APPLICATION_PATH, ['list', '--json']);
  const profiles = useMemo<Profile[]>(() => JSON.parse(data || "[]"), [data]);
  return {
    isLoading,
    profiles,
    revalidate,
  };
}
