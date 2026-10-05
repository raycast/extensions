import { ActionPanel, Action, Form, showToast, LaunchProps } from "@raycast/api";
import { useEffect, useState } from "react";
import { executeAction, provider, createErrorToast, createSuccessToast } from "./utils";
import { withAccessToken } from "@raycast/utils";
import { isValidSolanaAddress } from "./utils/is-valid-address";

interface BuyTokenFormValues {
  outputMint: string;
  inputAmount: string;
}

function BuyToken(props: LaunchProps<{ arguments: BuyTokenFormValues }>) {
  const [isLoading, setIsLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  useEffect(() => {
    const { outputMint, inputAmount } = props.arguments;
    if (outputMint && inputAmount) {
      handleSubmit({ outputMint, inputAmount });
    }
  }, [props.arguments.outputMint, props.arguments.inputAmount]);

  async function handleSubmit(values: BuyTokenFormValues) {
    if (isLoading) {
      return;
    }
    setIsLoading(true);

    try {
      const inputAmount = parseFloat(values.inputAmount);

      // Validation
      if (isNaN(inputAmount) || inputAmount <= 0) {
        await showToast(createErrorToast("Invalid amount", "Please enter a valid amount greater than 0"));
        return;
      }

      if (!isValidSolanaAddress(values.outputMint)) {
        await showToast(createErrorToast("Invalid token", "Please enter a valid token address"));
        return;
      }

      // Execute transaction
      const result = await executeAction("buy", {
        outputMint: values.outputMint,
        inputAmount,
      });

      const transactionHash = result.data?.toString() ?? null;
      setTxHash(transactionHash);

      await showToast(
        createSuccessToast(
          "Success",
          `Token purchase executed successfully${transactionHash ? ` - ${transactionHash}` : ""}`,
        ),
      );
    } catch (error) {
      await showToast(createErrorToast("Error", error, "Failed to execute token purchase"));
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
          <Action.SubmitForm title="Buy" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="outputMint"
        title="Token Address"
        placeholder="Enter token CA"
        defaultValue={props.arguments.outputMint}
      />
      <Form.TextField
        id="inputAmount"
        title="Amount (in SOL)"
        placeholder="Enter amount to spend"
        defaultValue={props.arguments.inputAmount}
      />
    </Form>
  );
}

export default withAccessToken(provider)(BuyToken);
