import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { WalletData } from "../lib/wallet";
import { COINS, BORROW_TYPES, NOCTRUM_DOMAIN } from "../lib/constants";
import { approveToken, depositToVault } from "../lib/chain";
import { fetchCollateralQuote, submitBorrowIntent, fetchPoolAddress } from "../lib/noctrum-api";
import { privateTransfer } from "../lib/external-api";
import { encryptRate } from "../lib/encryption";
import { ethers } from "ethers";
import { CollateralQuote, errorMessage } from "../lib/types";
import { loadProgress, saveProgress, clearProgress } from "../lib/progress";

// Amount in wei, or null while the input is empty, partial ("1.") or not a positive number.
function parseAmount(value: string): string | null {
  try {
    const wei = ethers.parseEther(value.trim());
    return wei > 0n ? wei.toString() : null;
  } catch {
    return null;
  }
}

export function BorrowFormView({ wallet }: { wallet: WalletData }) {
  const [token, setToken] = useState<string>(COINS[0].address);
  const [amount, setAmount] = useState("");
  const [maxRate, setMaxRate] = useState("");
  const [collateralToken, setCollateralToken] = useState<string>(COINS[1].address);
  // The quote is stored with the inputs it was fetched for, so a stale quote is never used.
  const [quoted, setQuoted] = useState<{ key: string; quote: CollateralQuote } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const amountWei = parseAmount(amount);
  const quoteKey = amountWei ? `${token}:${amountWei}:${collateralToken}` : "";
  const collateralQuote = quoted && quoted.key === quoteKey ? quoted.quote : null;

  useEffect(() => {
    setQuoted(null);
    if (!quoteKey || !amountWei) return;
    let cancelled = false;
    fetchCollateralQuote({
      account: wallet.address,
      token,
      amount: amountWei,
      collateralToken,
    })
      .then((quote) => {
        if (!cancelled) setQuoted({ key: quoteKey, quote });
      })
      .catch(() => {
        if (!cancelled) setQuoted(null);
      });
    return () => {
      cancelled = true;
    };
  }, [quoteKey]);

  async function handleSubmit() {
    if (!amountWei) {
      showToast(Toast.Style.Failure, "Enter a valid amount");
      return;
    }
    if (!maxRate) {
      showToast(Toast.Style.Failure, "Fill all fields");
      return;
    }
    const progressKey = `borrow:${wallet.address.toLowerCase()}:${quoteKey}`;
    const progress = await loadProgress(progressKey);
    // A resumed borrow keeps the collateral amount that was already moved; a new one needs a current quote.
    const collateralAmount = progress.data.collateralAmount ?? collateralQuote?.requiredCollateral;
    if (!collateralAmount) {
      showToast(Toast.Style.Failure, "Wait for the collateral quote");
      return;
    }
    setIsSubmitting(true);
    const toast = await showToast(Toast.Style.Animated, "Step 1/4: Approving collateral...");
    try {
      const save = (step: number) => saveProgress(progressKey, { step, data: { collateralAmount } });

      // Step 1: Approve collateral
      if (progress.step < 1) {
        await approveToken(wallet.privateKey, collateralToken, collateralAmount);
        await save(1);
      }

      // Step 2: Vault deposit collateral
      if (progress.step < 2) {
        toast.title = "Step 2/4: Depositing collateral...";
        await depositToVault(wallet.privateKey, collateralToken, collateralAmount);
        await save(2);
      }

      // Step 3: Private transfer collateral to pool
      if (progress.step < 3) {
        toast.title = "Step 3/4: Transferring collateral to pool...";
        const poolAddress = await fetchPoolAddress();
        await privateTransfer(wallet, poolAddress, collateralToken, collateralAmount);
        await save(3);
      }

      // Step 4: Submit borrow intent
      toast.title = "Step 4/4: Submitting borrow intent...";
      const encMaxRate = encryptRate(maxRate);
      const timestamp = Math.floor(Date.now() / 1000);
      const signer = new ethers.Wallet(wallet.privateKey);
      const auth = await signer.signTypedData(NOCTRUM_DOMAIN, BORROW_TYPES, {
        account: wallet.address,
        token,
        amount: amountWei,
        collateralToken,
        collateralAmount,
        encryptedMaxRate: encMaxRate,
        timestamp,
      });
      await submitBorrowIntent({
        account: wallet.address,
        token,
        amount: amountWei,
        collateralToken,
        collateralAmount,
        encryptedMaxRate: encMaxRate,
        timestamp,
        auth,
      });
      await clearProgress(progressKey);

      toast.style = Toast.Style.Success;
      toast.title = "Borrow intent created!";
    } catch (e) {
      console.log(e);
      toast.style = Toast.Style.Failure;
      toast.title = "Borrow failed";
      toast.message = errorMessage(e);
    }
    setIsSubmitting(false);
  }

  const collateralInfo = collateralQuote
    ? `Required: ${ethers.formatEther(collateralQuote.requiredCollateral)} (${collateralQuote.multiplier}x, Tier: ${collateralQuote.tier})`
    : "";

  return (
    <Form
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Borrow Intent" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="token" title="Borrow Token" value={token} onChange={setToken}>
        {COINS.map((c) => (
          <Form.Dropdown.Item
            key={c.address}
            value={c.address}
            title={c.symbol}
            icon={{ source: c.symbol === "nUSD" ? "nusd.png" : "neth.png" }}
          />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="amount"
        title="Amount"
        placeholder="e.g. 100"
        value={amount}
        onChange={setAmount}
        error={amount && !amountWei ? "Enter a positive number" : undefined}
      />
      <Form.TextField
        id="maxRate"
        title="Max Rate (%)"
        placeholder="e.g. 8"
        value={maxRate}
        onChange={setMaxRate}
        info="Maximum interest rate you're willing to accept."
      />
      <Form.Dropdown
        id="collateralToken"
        title="Collateral Token"
        value={collateralToken}
        onChange={setCollateralToken}
      >
        {COINS.map((c) => (
          <Form.Dropdown.Item
            key={c.address}
            value={c.address}
            title={c.symbol}
            icon={{ source: c.symbol === "nUSD" ? "nusd.png" : "neth.png" }}
          />
        ))}
      </Form.Dropdown>
      {collateralInfo && <Form.Description title="Collateral Quote" text={collateralInfo} />}
    </Form>
  );
}
