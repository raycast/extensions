import { useState } from "react";
import { CACHE_KEYS } from "~/constants/general";
import { Cache } from "~/utils/cache";
import useOnceEffect from "~/utils/hooks/useOnceEffect";

const getCliVersion = () => {
  const version = Cache.get(CACHE_KEYS.CLI_VERSION);
  if (version) return parseFloat(version);
  return -1;
};

export const useCliVersion = () => {
  const [version, setVersion] = useState<number>(getCliVersion);

  useOnceEffect(() => {
    Cache.subscribe((key, value) => {
      if (value && key === CACHE_KEYS.CLI_VERSION) {
        setVersion(parseFloat(value) || -1);
      }
    });
  });

  return version;
};
