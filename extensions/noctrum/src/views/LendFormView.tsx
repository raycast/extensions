import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { WalletData } from "../lib/wallet";
import { COINS, CONFIRM_DEPOSIT_TYPES, NOCTRUM_DOMAIN } from "../lib/constants";
import { approveToken, depositToVault, getOnChainBalance } from "../lib/chain";
import { initDepositLend, confirmDepositLend, fetchPoolAddress } from "../lib/noctrum-api";
import { privateTransfer } from "../lib/external-api";
import { encryptRate } from "../lib/encryption";
import { ethers } from "ethers";
import { errorMessage } from "../lib/types";

export function LendFormView({ wallet }: { wallet: WalletData }) {
  const [token, setToken] = useState<string>(COINS[0].address);
  const [amount, setAmount] = useState("");
  const [rate, setRate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [balances, setBalances] = useState<Record<string, string>>({});

  useEffect(() => {
    Promise.all(
      COINS.map(async (c) => ({
        address: c.address,
        balance: await getOnChainBalance(c.address, wallet.address),
      })),
    )
      .then((results) => {
        const map: Record<string, string> = {};
        for (const r of results) map[r.address] = r.balance;
        setBalances(map);
      })
      .catch((e) => console.log(e));
  }, []);

  const fmtBal = (addr: string) => {
    const wei = balances[addr];
    if (!wei) return "Loading...";
    try {
      return ethers.formatEther(wei);
    } catch {
      return wei;
    }
  };

  const selectedCoin = COINS.find((c) => c.address === token);

  async function handleSubmit() {
    if (!amount || !rate) {
      showToast(Toast.Style.Failure, "Fill all fields");
      return;
    }
    setIsSubmitting(true);
    const toast = await showToast(Toast.Style.Animated, "Step 1/5: Approving token...");
    try {
      const amountWei = ethers.parseEther(amount).toString();

      // Step 1: Approve
      await approveToken(wallet.privateKey, token, amountWei);

      // Step 2: Vault deposit
      toast.title = "Step 2/5: Depositing to vault...";
      await depositToVault(wallet.privateKey, token, amountWei);

      // Step 3: Init lend (get slotId)
      toast.title = "Step 3/5: Initializing lend slot...";
      const { slotId } = await initDepositLend({ account: wallet.address, token, amount: amountWei });

      // Step 4: Private transfer to pool
      toast.title = "Step 4/5: Private transfer to pool...";
      const poolAddress = await fetchPoolAddress();
      await privateTransfer(wallet, poolAddress, token, amountWei);

      // Step 5: Confirm with encrypted rate
      toast.title = "Step 5/5: Confirming with encrypted rate...";
      const encRate = encryptRate(rate);
      const timestamp = Math.floor(Date.now() / 1000);
      const signer = new ethers.Wallet(wallet.privateKey);
      const auth = await signer.signTypedData(NOCTRUM_DOMAIN, CONFIRM_DEPOSIT_TYPES, {
        account: wallet.address,
        slotId,
        encryptedRate: encRate,
        timestamp,
      });
      await confirmDepositLend({
        account: wallet.address,
        slotId,
        encryptedRate: encRate,
        timestamp,
        auth,
      });

      toast.style = Toast.Style.Success;
      toast.title = "Lend intent created!";
    } catch (e) {
      console.log(e);
      toast.style = Toast.Style.Failure;
      toast.title = "Lend failed";
      toast.message = errorMessage(e);
    }
    setIsSubmitting(false);
  }

  return (
    <Form
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Lend Intent" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="token" title="Token" value={token} onChange={setToken}>
        {COINS.map((c) => (
          <Form.Dropdown.Item
            key={c.address}
            value={c.address}
            title={`${c.symbol} (${fmtBal(c.address)})`}
            icon={{ source: c.symbol === "nUSD" ? "nusd.png" : "neth.png" }}
          />
        ))}
      </Form.Dropdown>
      <Form.Description title="On-Chain Balance" text={`${fmtBal(token)} ${selectedCoin?.symbol ?? ""}`} />
      <Form.TextField id="amount" title="Amount" placeholder="e.g. 100" value={amount} onChange={setAmount} />
      {amount && (
        <Form.Description
          title="You Will Deposit"
          text={`${amount} ${selectedCoin?.symbol ?? ""} as lending capital`}
        />
      )}
      <Form.TextField
        id="rate"
        title="Interest Rate (%)"
        placeholder="e.g. 5"
        value={rate}
        onChange={setRate}
        info="Your desired lending rate. This will be encrypted and only visible to the CRE matching engine."
      />
    </Form>
  );
}
