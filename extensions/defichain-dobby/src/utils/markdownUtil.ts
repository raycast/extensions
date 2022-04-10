import { DobbyVault } from "../models/dobbyVault";

export function getVaultsSummary(vaults: DobbyVault[] | null): string {
  const activeVaults = vaults?.filter((x) => x.state === "active") ?? [];
  const frozenVaults = vaults?.filter((x) => x.state === "frozen") ?? [];
  const inactiveVaults = vaults?.filter((x) => x.state === "inactive") ?? [];
  const mayLiquidateVaults = vaults?.filter((x) => x.state === "mayLiquidate") ?? [];
  const inLiquidationVaults = vaults?.filter((x) => x.state === "inLiquidation") ?? [];

  let markdown = `# My Dobby vaults  
  
  ${activeVaults.length > 0 ? `## ${activeVaults.length} Active` : `### ${activeVaults.length} Active`}
  ${
    inLiquidationVaults.length > 0
      ? `## ${inLiquidationVaults.length} In liquidation`
      : `### ${inLiquidationVaults.length} In liquidation`
  }
  ${
    mayLiquidateVaults.length > 0
      ? `## ${mayLiquidateVaults.length} May liquidate`
      : `### ${mayLiquidateVaults.length} May liquidate`
  }
  ${frozenVaults.length > 0 ? `## ${frozenVaults.length} Frozen` : `#### ${frozenVaults.length} Frozen`}
  ${inactiveVaults.length > 0 ? `## ${inactiveVaults.length} Inactive` : `### ${inactiveVaults.length} Inactive`}
 
 &nbsp;  
 &nbsp;  
 **More information**  
  [Dobby Dashboard](https://defichain-dobby.com)
`;

  return markdown;
}

export function transformVaultsToMarkdown(vaults: DobbyVault[] | null): string {
  let markdownString = "";

  vaults?.forEach((vault) => {
    markdownString += `
### [${vault.name?.length > 0 ? vault.name : vault.vaultId}](https://defiscan.live/vaults/${vault.vaultId})
- next ratio: ##${vault.nextCollateralRatio.toFixed(1)} %
- next ratio: **${vault.nextCollateralRatio.toFixed(1)} %**
- current ratio: ${vault.collateralRatio} %
- state: ${vault.state} at loan scheme ${vault.loanScheme.minCollateral} %
- collateral value: ${vault.collateralValue.toFixed(2)} $
- loan value: ${vault.loanValue.toFixed(2)} $
---    
`;
  });

  return markdownString;
}
