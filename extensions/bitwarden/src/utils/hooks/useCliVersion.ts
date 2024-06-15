import { useState } from "react";
import { CACHE_KEYS } from "~/constants/general";
import { Cache } from "~/utils/cache";
import useOnceEffect from "~/utils/hooks/useOnceEffect";

export const useCliVersion = () => {
  const [cliVersion, setCliVersion] = useState<string>(Cache.get(CACHE_KEYS.CLI_VERSION) ?? "");

  useOnceEffect(() => {
    Cache.subscribe((key, value) => {
      if (value && key === CACHE_KEYS.CLI_VERSION) {
        setCliVersion(value);
      }
    });
  });

  return cliVersion;
};
