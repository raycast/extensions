import { VaultState } from "./vaultState";
import { LoanSchema } from "./loanSchema";

export type DobbyVault = {
  vaultId: string;
  name: string;
  ownerAddress: string;
  loanScheme: LoanSchema;
  state: VaultState;
  collateralValue: number;
  loanValue: number;
  collateralRatio: number;
  nextCollateralRatio: number;
};
