import { List, Icon, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { WalletData } from "../lib/wallet";
import {
  fetchBorrowerStatus,
  cancelBorrow as apiCancelBorrow,
  acceptProposal as apiAcceptProposal,
  rejectProposal as apiRejectProposal,
  claimExcessCollateral as apiClaimExcess,
} from "../lib/noctrum-api";
import {
  tokenName,
  tokenIcon,
  CANCEL_BORROW_TYPES,
  ACCEPT_PROPOSAL_TYPES,
  REJECT_PROPOSAL_TYPES,
  CLAIM_EXCESS_COLLATERAL_TYPES,
  NOCTRUM_DOMAIN,
} from "../lib/constants";
import { ethers } from "ethers";
import { repayLoan } from "../lib/repay";
import { BorrowerStatus, errorMessage } from "../lib/types";

export function BorrowPositionsView({ wallet }: { wallet: WalletData }) {
  const [data, setData] = useState<BorrowerStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function load() {
    if (!wallet?.address) return;
    setIsLoading(true);
    try {
      setData(await fetchBorrowerStatus(wallet.address));
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

  async function signAndCall<M extends Record<string, unknown>>(
    types: Record<string, ethers.TypedDataField[]>,
    message: M,
    apiCall: (body: M & { auth: string }) => Promise<unknown>,
    label: string,
  ) {
    const toast = await showToast(Toast.Style.Animated, label);
    try {
      if (!signer) throw new Error("Wallet not loaded");
      const auth = await signer.signTypedData(NOCTRUM_DOMAIN, types, message);
      await apiCall({ ...message, auth });
      toast.style = Toast.Style.Success;
      toast.title = `${label} - Done`;
      load();
    } catch (e) {
      console.log(e);
      toast.style = Toast.Style.Failure;
      toast.title = label;
      toast.message = errorMessage(e);
    }
  }

  const handleCancelBorrow = (intentId: string) =>
    signAndCall(
      CANCEL_BORROW_TYPES,
      { account: wallet.address, intentId, timestamp: ts() },
      apiCancelBorrow,
      "Cancelling borrow",
    );

  const handleAccept = (proposalId: string) =>
    signAndCall(
      ACCEPT_PROPOSAL_TYPES,
      { account: wallet.address, proposalId, timestamp: ts() },
      apiAcceptProposal,
      "Accepting proposal",
    );

  const handleReject = (proposalId: string) =>
    signAndCall(
      REJECT_PROPOSAL_TYPES,
      { account: wallet.address, proposalId, timestamp: ts() },
      apiRejectProposal,
      "Rejecting proposal",
    );

  async function handleRepay(loanId: string, token: string, totalDue: string) {
    const toast = await showToast(Toast.Style.Animated, "Repaying loan");
    try {
      if (!signer) throw new Error("Wallet not loaded");
      await repayLoan(wallet, loanId, token, totalDue, toast);
      toast.style = Toast.Style.Success;
      toast.title = "Repaying loan - Done";
      load();
    } catch (e) {
      console.log(e);
      toast.style = Toast.Style.Failure;
      toast.title = "Repaying loan";
      toast.message = errorMessage(e);
    }
  }

  const handleClaimExcess = (loanId: string) =>
    signAndCall(
      CLAIM_EXCESS_COLLATERAL_TYPES,
      { account: wallet.address, loanId, timestamp: ts() },
      apiClaimExcess,
      "Claiming excess collateral",
    );

  const fmt = (wei: string) => {
    try {
      return ethers.formatEther(wei);
    } catch {
      return wei;
    }
  };

  return (
    <List isLoading={isLoading}>
      <List.Section title="Pending Borrow Intents">
        {data?.pendingIntents?.map((i) => (
          <List.Item
            key={i.intentId}
            title={`${fmt(i.amount)} ${tokenName(i.token)}`}
            subtitle={`Collateral: ${fmt(i.collateralAmount)} ${tokenName(i.collateralToken)}`}
            icon={{ source: tokenIcon(i.token) }}
            accessories={[{ tag: i.status }]}
            actions={
              <ActionPanel>
                <Action
                  title="Cancel Borrow"
                  onAction={() => handleCancelBorrow(i.intentId)}
                  style={Action.Style.Destructive}
                />
              </ActionPanel>
            }
          />
        ))}
        {(!data?.pendingIntents || data.pendingIntents.length === 0) && !isLoading && (
          <List.Item title="No pending intents" icon={Icon.XMarkCircle} />
        )}
      </List.Section>

      <List.Section title="Pending Proposals">
        {data?.pendingProposals?.map((p) => (
          <List.Item
            key={p.proposalId}
            title={`${fmt(p.principal)} ${tokenName(p.token)}`}
            subtitle={`${(p.effectiveRate * 100).toFixed(2)}% interest`}
            icon={{ source: tokenIcon(p.token) }}
            accessories={[{ tag: `Expires ${new Date(p.expiresAt).toLocaleDateString()}` }]}
            actions={
              <ActionPanel>
                <Action title="Accept Proposal" onAction={() => handleAccept(p.proposalId)} />
                <Action
                  title="Reject Proposal"
                  onAction={() => handleReject(p.proposalId)}
                  style={Action.Style.Destructive}
                />
              </ActionPanel>
            }
          />
        ))}
        {(!data?.pendingProposals || data.pendingProposals.length === 0) && !isLoading && (
          <List.Item title="No pending proposals" icon={Icon.XMarkCircle} />
        )}
      </List.Section>

      <List.Section title="Active Loans">
        {data?.activeLoans?.map((l) => (
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
        {(!data?.activeLoans || data.activeLoans.length === 0) && !isLoading && (
          <List.Item title="No active loans" icon={Icon.XMarkCircle} />
        )}
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
