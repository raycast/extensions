import { useEffect } from "react";
import { OWLMapping } from "../types/owl";
import { StorageKey } from "../types/storage";
import { loadDefaultOWLs } from "../utils/loadDefaultOWLs";
import { useKeyboards } from "./keyboards";
import { useLanguages } from "./languages";
import { useCachedStorage } from "./storage";

export type UseInitializeOWLs = {
  isInitialized: boolean;
  reinitialize: () => void;
};

export function useInitializeOWLs(
  { showAlert = false }: { showAlert: boolean } = { showAlert: false },
): UseInitializeOWLs {
  const [, setOWLs] = useCachedStorage<OWLMapping>(StorageKey.OWLS, {});
  const [isInit, setIsInit] = useCachedStorage<boolean>(StorageKey.INIT, false);

  const { keyboards } = useKeyboards();
  const { value: languages } = useLanguages();

  useEffect(() => {
    if (keyboards.length === 0 || languages.length === 0 || isInit) {
      return;
    }

    loadDefaultOWLs({
      keyboards,
      languages,
      setOWLs,
      showAlert,
    }).then(() => {
      setIsInit(true);
    });
  }, [isInit, keyboards, languages]);

  return {
    isInitialized: isInit,
    reinitialize: () => {
      setIsInit(false);
    },
  };
}
