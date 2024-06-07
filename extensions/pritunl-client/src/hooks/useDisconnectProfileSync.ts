import { APPLICATION_PATH } from "../constants";
import { Profile } from "../types";
import { useCallback } from "react";
import { execSync } from "child_process";

export const useDisconnectProfileSync = () => {
  return useCallback((profile: Profile) => {
    return execSync(`${APPLICATION_PATH} stop ${profile.id}`);
  }, []);
};
