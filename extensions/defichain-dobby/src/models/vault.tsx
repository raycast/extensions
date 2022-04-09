export type TStringEnum = { [key: string]: string };

export type vaultState = "active" | "frozen" | "inactive" | "mayLiquidate" | "inLiquidation";

export type DobbyVault = {
  vaultId: string;
  name: string;
  ownerAddress: string;
  loanScheme: number;
  state: vaultState;
  collateralValue: number;
  loanValue: number;
  collateralRatio: number;
  nextCollateralRatio: number;
};

export function transformVaultsToMarkdown(vaults: DobbyVault[]): string {
  let markdownString = "";
  vaults.forEach((vault) => {
    markdownString += `
### vault [${vault.name ?? vault.vaultId}](https://defiscan.live/vaults/${vault.vaultId}):
    
- next ratio: ***${parseFloat(Number(vault.nextCollateralRatio)).toFixed(1)} %***
- current ratio: ${vault.collateralRatio} %
- state: ${vault.state} at loan scheme ${vault.loanScheme} %
- collateral value: ${parseFloat(Number(vault.collateralValue)).toFixed(2)} $
- loan value: ${parseFloat(Number(vault.loanValue)).toFixed(2)} $


---    
`;
  });
  return markdownString;
}
