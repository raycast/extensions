import { useEffect, useState } from "react";
import { colimaTemplateDefaults } from "../utils/cli";
import type { ColimaTemplateDefaults } from "../utils/types";

const FALLBACK_DEFAULTS: ColimaTemplateDefaults = {
  cpus: 2,
  memory: 2,
  disk: 100,
  runtime: "docker",
  vmType: "qemu",
  kubernetes: false,
};

export function useColimaTemplateDefaults() {
  const [defaults, setDefaults] = useState<ColimaTemplateDefaults>(FALLBACK_DEFAULTS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const result = await colimaTemplateDefaults();
        setDefaults(result);
      } catch {
        // keep fallback defaults
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  return { defaults, isLoading };
}
