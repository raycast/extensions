import { ActionPanel, Action, Form, showToast, LaunchProps } from "@raycast/api";
import { useEffect, useState } from "react";
import { executeAction, provider, createErrorToast, createSuccessToast } from "./utils";
import { withAccessToken } from "@raycast/utils";

interface SellTokenFormValues {
  inputMint: string;
  inputAmount: string;
}

function SellToken(props: LaunchProps<{ arguments: SellTokenFormValues }>) {
  const [isLoading, setIsLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  useEffect(() => {
    const { inputMint, inputAmount } = props.arguments;
    if (inputMint && inputAmount) {
      handleSubmit({ inputMint, inputAmount });
    }
  }, [props.arguments.inputMint, props.arguments.inputAmount]);

  async function handleSubmit(values: SellTokenFormValues) {
    try {
      setIsLoading(true);
      const inputAmount = parseFloat(values.inputAmount);

      // Validation
      if (isNaN(inputAmount) || inputAmount <= 0) {
        await showToast(createErrorToast("Invalid amount", "Please enter a valid amount greater than 0"));
        return;
      }

      if (!values.inputMint || values.inputMint.trim() === "") {
        await showToast(createErrorToast("Invalid token address", "Please enter a valid token mint address"));
        return;
      }

      // Execute transaction
      const result = await executeAction("sell", {
        inputAmount,
        inputMint: values.inputMint,
      });

      const transactionHash = result.data?.toString() ?? null;
      setTxHash(transactionHash);

      await showToast(createSuccessToast("Success", "Token sale executed successfully"));
    } catch (error) {
      await showToast(createErrorToast("Error", error, "Failed to execute token sale"));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      searchBarAccessory={
        txHash ? <Form.LinkAccessory target={`https://solscan.io/tx/${txHash}`} text="View on Solscan" /> : null
      }
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Sell" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        defaultValue={props.arguments.inputMint}
        id="inputMint"
        title="Token Address"
        placeholder="Enter token CA"
      />
      <Form.TextField
        defaultValue={props.arguments.inputAmount}
        id="inputAmount"
        title="Amount"
        placeholder="Enter amount to sell"
      />
    </Form>
  );
}

export default withAccessToken(provider)(SellToken);
