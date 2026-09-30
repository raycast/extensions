import { Form, ActionPanel, Action, showToast, Toast, LocalStorage } from "@raycast/api";
import { useState } from "react";
import { WalletSetupFormProps } from "../types";
import { validateSolanaAddress } from "../utils/formatters";
import { USER_WALLET_ADDRESS_KEY } from "../constants";

export function WalletSetupForm({ onWalletSet }: WalletSetupFormProps) {
  const [address, setAddress] = useState<string>("");
  const [error, setError] = useState<string | undefined>(undefined);

  async function handleSubmit() {
    const { isValid, error: validationError } = validateSolanaAddress(address);
    if (!isValid) {
      setError(validationError);
      return;
    }
    setError(undefined);

    await LocalStorage.setItem(USER_WALLET_ADDRESS_KEY, address);
    await showToast({
      style: Toast.Style.Success,
      title: "Wallet Address Saved",
      message: "Your Solana wallet address has been stored.",
    });
    onWalletSet(address);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Wallet Address" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Enter your Solana public wallet address to check balances and prepare transactions." />
      <Form.TextField
        id="walletAddress"
        title="Solana Wallet Address"
        placeholder="Enter public wallet address"
        value={address}
        error={error}
        onChange={setAddress}
        onBlur={() => {
          const { isValid, error: validationError } = validateSolanaAddress(address);
          setError(isValid ? undefined : validationError);
        }}
      />
    </Form>
  );
}
