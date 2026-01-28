import { useEffect, useState } from "react";
import { DobbyVault } from "./models/dobbyVault";
import { getVaultsSummary } from "./utils/markdownUtil";
import { getVaults } from "./api";
import { LoadingStatus } from "./models/loadingStatus";

export function useVaults() {
  const [status, setStatus] = useState<LoadingStatus>("loading");
  const [vaultsSummaryMarkdown, setVaultsSummaryMarkdown] = useState<string>("### loading your vaults...");
  const [vaults, setVaults] = useState<DobbyVault[] | null>(null);

  useEffect(() => {
    const summaryMarkdown = getVaultsSummary(vaults);
    setVaultsSummaryMarkdown(summaryMarkdown);
  }, [vaults]);

  useEffect(() => {
    async function fetchVaults() {
      try {
        const vaults = await getVaults();
        setVaults(vaults);
        setStatus("success");
      } catch (error) {
        setStatus("failure");
      }
    }
    fetchVaults();
  }, []);

  return { status, vaults, vaultsSummaryMarkdown };
}
