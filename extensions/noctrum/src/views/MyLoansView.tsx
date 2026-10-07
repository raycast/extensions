import { List, Icon, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { WalletData } from "../lib/wallet";
import {
  fetchLenderStatus,
  fetchBorrowerStatus,
  repayLoan as apiRepayLoan,
  fetchPoolAddress,
  claimExcessCollateral as apiClaimExcess,
} from "../lib/noctrum-api";
import {
  tokenName,
  tokenIcon,
  REPAY_LOAN_TYPES,
  CLAIM_EXCESS_COLLATERAL_TYPES,
  NOCTRUM_DOMAIN,
} from "../lib/constants";
import { ethers } from "ethers";
import { privateTransfer } from "../lib/external-api";
import { Loan, errorMessage } from "../lib/types";

export function MyLoansView({ wallet }: { wallet: WalletData }) {
  const [lenderLoans, setLenderLoans] = useState<Loan[]>([]);
  const [borrowerLoans, setBorrowerLoans] = useState<Loan[]>([]);
  const [completedLoans, setCompletedLoans] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function load() {
    if (!wallet?.address) return;
    setIsLoading(true);
    try {
      const [lender, borrower] = await Promise.all([
        fetchLenderStatus(wallet.address),
        fetchBorrowerStatus(wallet.address),
      ]);
      setLenderLoans(lender?.activeLoans ?? []);
      setBorrowerLoans(borrower?.activeLoans ?? []);
      setCompletedLoans(lender?.completedLoans ?? []);
    } catch (e) {
      console.log(e);
      showToast(Toast.Style.Failure, "Error", errorMessage(e));
    }
    setIsLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const ts = () => Math.floor(Date.now() / 1000);
  const signer = wallet?.privateKey ? new ethers.Wallet(wallet.privateKey) : null;

  const fmt = (wei: string) => {
    try {
      return ethers.formatEther(wei);
    } catch {
      return wei;
    }
  };

  async function handleRepay(loanId: string, token: string, totalDue: string) {
    const toast = await showToast(Toast.Style.Animated, "Repaying loan");
    try {
      if (!signer) throw new Error("No wallet");
      toast.title = "Transferring repayment to pool";
      await privateTransfer(wallet, await fetchPoolAddress(), token, totalDue);
      toast.title = "Repaying loan";
      const message = { account: wallet.address, loanId, amount: totalDue, timestamp: ts() };
      const auth = await signer.signTypedData(NOCTRUM_DOMAIN, REPAY_LOAN_TYPES, message);
      await apiRepayLoan({ ...message, auth });
      toast.style = Toast.Style.Success;
      toast.title = "Repaid";
      load();
    } catch (e) {
      console.log(e);
      toast.style = Toast.Style.Failure;
      toast.title = "Repay failed";
      toast.message = errorMessage(e);
    }
  }

  async function handleClaimExcess(loanId: string) {
    const toast = await showToast(Toast.Style.Animated, "Claiming excess collateral");
    try {
      if (!signer) throw new Error("No wallet");
      const message = { account: wallet.address, loanId, timestamp: ts() };
      const auth = await signer.signTypedData(NOCTRUM_DOMAIN, CLAIM_EXCESS_COLLATERAL_TYPES, message);
      await apiClaimExcess({ ...message, auth });
      toast.style = Toast.Style.Success;
      toast.title = "Claimed";
      load();
    } catch (e) {
      console.log(e);
      toast.style = Toast.Style.Failure;
      toast.title = "Claim failed";
      toast.message = errorMessage(e);
    }
  }

  return (
    <List isLoading={isLoading}>
      <List.Section title={`Borrowing (${borrowerLoans.length})`}>
        {borrowerLoans.map((l) => (
          <List.Item
            key={l.loanId}
            title={`${fmt(l.principal)} ${tokenName(l.token)}`}
            subtitle={`${(l.effectiveRate * 100).toFixed(2)}% interest`}
            icon={{ source: tokenIcon(l.token) }}
            accessories={[
              { tag: `Due: ${fmt(l.totalDue)} ${tokenName(l.token)}` },
              { tag: `Repaid: ${fmt(l.repaidAmount)}` },
              ...(l.collateralAmount
                ? [{ tag: `Collateral: ${fmt(l.collateralAmount)} ${tokenName(l.collateralToken)}` }]
                : []),
              ...(l.excessCollateral && BigInt(l.excessCollateral) > 0n
                ? [{ tag: `Excess: ${fmt(l.excessCollateral)}` }]
                : []),
              { text: `Maturity: ${new Date(l.maturity).toLocaleDateString()}` },
            ]}
            actions={
              <ActionPanel>
                <Action title="Repay Full" onAction={() => handleRepay(l.loanId, l.token, l.totalDue)} />
                {l.excessCollateral && BigInt(l.excessCollateral) > 0n && (
                  <Action title="Claim Excess Collateral" onAction={() => handleClaimExcess(l.loanId)} />
                )}
                <Action.CopyToClipboard title="Copy Loan ID" content={l.loanId} />
              </ActionPanel>
            }
          />
        ))}
        {borrowerLoans.length === 0 && !isLoading && <List.Item title="No active borrows" icon={Icon.XMarkCircle} />}
      </List.Section>

      <List.Section title={`Lending (${lenderLoans.length})`}>
        {lenderLoans.map((l) => (
          <List.Item
            key={l.loanId}
            title={`${fmt(l.principal)} ${tokenName(l.token)}`}
            subtitle={`${(l.rate * 100).toFixed(2)}% interest`}
            icon={{ source: tokenIcon(l.token) }}
            accessories={[
              { tag: `Payout: ${fmt(l.expectedPayout)} ${tokenName(l.token)}` },
              { text: `Maturity: ${new Date(l.maturity).toLocaleDateString()}` },
            ]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Loan ID" content={l.loanId} />
              </ActionPanel>
            }
          />
        ))}
        {lenderLoans.length === 0 && !isLoading && <List.Item title="No active lends" icon={Icon.XMarkCircle} />}
      </List.Section>

      <List.Section title={`Completed (${completedLoans.length})`}>
        {completedLoans.map((l) => (
          <List.Item
            key={l.loanId}
            title={`${fmt(l.principal)} ${tokenName(l.token)}`}
            subtitle={l.status}
            icon={{ source: tokenIcon(l.token) }}
          />
        ))}
      </List.Section>

      <List.Section title="Actions">
        <List.Item
          title="Refresh"
          icon={Icon.ArrowClockwise}
          actions={
            <ActionPanel>
              <Action title="Refresh" onAction={load} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
