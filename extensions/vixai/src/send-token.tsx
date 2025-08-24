import { ActionPanel, Action, Form } from "@raycast/api";
import { useState } from "react";
import { withAccessToken, useForm } from "@raycast/utils";
import { TokensDropdown } from "./components/TokensDropdown";
import { provider } from "./auth/provider";
import WalletAPI from "./api/wallet";
import { toastError, toastSuccess } from "./utils/toast";
import { isAddress } from "@solana/kit";

interface FormValues {
  to: string;
  mintAddress: string;
  amount: string;
}

function SendToken() {
  const [isLoading, setIsLoading] = useState(false);
  const [txSignature, setTxSignature] = useState<string | undefined>(undefined);

  const { handleSubmit, itemProps, reset } = useForm<FormValues>({
    async onSubmit(values) {
      await handleTransfer(values);
      reset();
    },
    validation: {
      to: (value) => {
        if (!value || !isAddress(value)) {
          return "Please enter a valid wallet address";
        }
      },
      mintAddress: (value) => {
        if (!value || !isAddress(value)) {
          return "Invalid token address";
        }
      },
      amount: (value) => {
        if (!value || value.trim() === "") {
          return "Please enter an amount";
        }
        const amount = parseFloat(value);
        if (isNaN(amount) || amount <= 0) {
          return "Please enter a valid amount greater than 0";
        }
      },
    },
  });

  async function handleTransfer(values: FormValues) {
    if (isLoading) {
      return;
    }
    try {
      setIsLoading(true);
      const amount = parseFloat(values.amount);

      const result = await WalletAPI.transfer({
        mint: values.mintAddress,
        to_address: values.to,
        amount: amount,
      });

      await toastSuccess({
        title: "Success",
        message: "Transfer executed successfully",
      });

      setTxSignature(result.tx_signature);
    } catch (error) {
      await toastError(error, {
        title: "Error",
        message: "Failed to transfer token",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Transfer Token" onSubmit={handleSubmit} />
        </ActionPanel>
      }
      searchBarAccessory={
        txSignature ? (
          <Form.LinkAccessory target={`https://solscan.io/tx/${txSignature}`} text="View on Solscan" />
        ) : null
      }
    >
      <TokensDropdown title="Token" placeholder="Select token" itemProps={itemProps.mintAddress} />
      <Form.TextField {...itemProps.to} title="To Address" placeholder="Enter wallet address" />
      <Form.TextField {...itemProps.amount} title="Amount" placeholder="Enter amount to transfer" />
    </Form>
  );
}

export default withAccessToken(provider)(SendToken);
