import { DobbyVault } from "./models/dobbyVault";
import { Detail } from "@raycast/api";
import { getVaultStateColor } from "./utils/stateUtil";

type Props = { vault: DobbyVault; no: number };

export default function VaultMetadata({ vault, no }: Props) {
  return (
    <>
      {no > 0 && <Detail.Metadata.Separator />}
      <Detail.Metadata.TagList title={""}>
        <Detail.Metadata.TagList.Item
          text={vault.state.toUpperCase().replace("_", " ")}
          color={getVaultStateColor(vault.state)}
        />
      </Detail.Metadata.TagList>
      <Detail.Metadata.Link
        title="Vault id"
        target={`https://defiscan.live/vaults/${vault.vaultId}`}
        text={vault.vaultId}
      />
      <Detail.Metadata.Label title="Vault name" text={`${vault.name}`} />
      <Detail.Metadata.Label title="Next ratio" text={`${vault.nextCollateralRatio?.toFixed(1)} %`} />
      <Detail.Metadata.Label title="Current ratio" text={`${vault.collateralRatio?.toFixed(1)} %`} />
      <Detail.Metadata.Label title="Collateral value" text={`${vault.collateralRatio?.toFixed(2)} $`} />
      <Detail.Metadata.Label title="Loan value" text={`${vault.loanValue?.toFixed(2)} $`} />
    </>
  );
}
