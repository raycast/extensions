import { APPLICATION_PATH } from "../constants";
import { useCallback } from "react";
import { Preferences, Profile } from "../types";
import { getPreferenceValues } from "@raycast/api";
import { generateToken } from "node-2fa";
import { execSync } from "child_process";

export const useConnectProfileSync = () => {
  const { twoStepKey, pin } = getPreferenceValues<Preferences>();
  return useCallback((profile: Profile) => {
      const { token } = generateToken(twoStepKey) || {};
      return execSync(`${APPLICATION_PATH} start ${profile.id} --password ${pin}${token}`);
    },
    [pin, twoStepKey],
  );
};
