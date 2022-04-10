import { useEffect, useState } from "react";
import { DobbyVault } from "./models/dobbyVault";
import { getVaultsSummary, transformVaultsToMarkdown } from "./utils/markdownUtil";
import { getVaults } from "./api";
import { LoadingStatus } from "./models/loadingStatus";

export function useVaults() {
  const [status, setStatus] = useState<LoadingStatus>("loading");
  const [vaultsMarkdown, setVaultsMarkdown] = useState<string>("### loading your vaults...");
  const [vaultsSummaryMarkdown, setVaultsSummaryMarkdown] = useState<string>("### loading your vaults...");
  const [vaults, setVaults] = useState<DobbyVault[] | null>(null);

  useEffect(() => {
    const markdown = transformVaultsToMarkdown(vaults);
    const summaryMarkdown = getVaultsSummary(vaults);
    setVaultsSummaryMarkdown(summaryMarkdown);
    setVaultsMarkdown(markdown);
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

  return { status, vaults, vaultsMarkdown, vaultsSummaryMarkdown };
}
