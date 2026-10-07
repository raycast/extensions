import { Detail, ActionPanel, Action, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { WalletData } from "../lib/wallet";
import { fetchCreditScore } from "../lib/noctrum-api";
import type { CreditScoreData } from "../hooks/useCreditScore";

export function ProfileView({ wallet }: { wallet: WalletData }) {
  const [score, setScore] = useState<CreditScoreData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCreditScore(wallet.address)
      .then(setScore)
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <Detail isLoading markdown="Loading profile..." />;
  if (!score) return <Detail markdown="Failed to load credit score." />;

  const md = `
# Credit Score & Profile

| Field | Value |
|-------|-------|
| **Address** | \`${wallet.address}\` |
| **Tier** | ${score.tier} |
| **Loans Repaid** | ${score.loansRepaid} |
| **Loans Defaulted** | ${score.loansDefaulted} |
| **Collateral Multiplier** | ${score.collateralMultiplier}x |
| **ETH Price** | $${score.ethPrice?.toFixed(2) ?? "N/A"} |
`;

  return (
    <Detail
      markdown={md}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Tier" text={score.tier} icon={Icon.Star} />
          <Detail.Metadata.Label title="Repaid" text={String(score.loansRepaid)} />
          <Detail.Metadata.Label title="Defaulted" text={String(score.loansDefaulted)} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Multiplier" text={`${score.collateralMultiplier}x`} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Address" content={wallet.address} />
        </ActionPanel>
      }
    />
  );
}
