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

export function BorrowFormView({ wallet }: { wallet: WalletData }) {
  const [token, setToken] = useState<string>(COINS[0].address);
  const [amount, setAmount] = useState("");
  const [maxRate, setMaxRate] = useState("");
  const [collateralToken, setCollateralToken] = useState<string>(COINS[1].address);
  const [collateralQuote, setCollateralQuote] = useState<CollateralQuote | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!amount || !token || !collateralToken) return;
    const amtWei = ethers.parseEther(amount).toString();
    fetchCollateralQuote({
      account: wallet.address,
      token,
      amount: amtWei,
      collateralToken,
    })
      .then(setCollateralQuote)
      .catch(() => setCollateralQuote(null));
  }, [amount, token, collateralToken]);

  async function handleSubmit() {
    if (!amount || !maxRate || !collateralQuote) {
      showToast(Toast.Style.Failure, "Fill all fields & wait for collateral quote");
      return;
    }
    setIsSubmitting(true);
    const toast = await showToast(Toast.Style.Animated, "Step 1/4: Approving collateral...");
    try {
      const collateralAmount = collateralQuote.requiredCollateral;

      // Step 1: Approve collateral
      await approveToken(wallet.privateKey, collateralToken, collateralAmount);

      // Step 2: Vault deposit collateral
      toast.title = "Step 2/4: Depositing collateral...";
      await depositToVault(wallet.privateKey, collateralToken, collateralAmount);

      // Step 3: Private transfer collateral to pool
      toast.title = "Step 3/4: Transferring collateral to pool...";
      const poolAddress = await fetchPoolAddress();
      await privateTransfer(wallet, poolAddress, collateralToken, collateralAmount);

      // Step 4: Submit borrow intent
      toast.title = "Step 4/4: Submitting borrow intent...";
      const amountWei = ethers.parseEther(amount).toString();
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
      <Form.TextField id="amount" title="Amount" placeholder="e.g. 100" value={amount} onChange={setAmount} />
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
