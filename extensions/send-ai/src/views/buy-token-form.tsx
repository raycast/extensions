import { ActionPanel, Action, Form, showToast, Toast, LaunchProps, Detail } from "@raycast/api";
import { useState } from "react";
import { executeAction } from "../utils/api-wrapper";
import { provider } from "../utils/auth";
import { withAccessToken } from "@raycast/utils";
import { isValidSolanaAddress } from "../utils/is-valid-address";

function BuyTokenForm(props: LaunchProps<{ arguments: { outputMint: string } }>) {
  const [isLoading, setIsLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  async function handleSubmit(values: { outputMint: string; inputAmount: string }) {
    try {
      setIsLoading(true);

      const inputAmount = parseFloat(values.inputAmount);

      if (isNaN(inputAmount) || inputAmount <= 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Invalid amount",
          message: "Please enter a valid amount greater than 0",
        });
        return;
      }

      if (!isValidSolanaAddress(values.outputMint)) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Invalid token",
          message: "Please enter a valid token address",
        });
        return;
      }

      const result = await executeAction(
        "buy",
        {
          outputMint: values.outputMint,
          inputAmount: inputAmount,
        },
        false,
      );

      setTxHash(result.data?.toString() ?? null);

      await showToast({
        style: Toast.Style.Success,
        title: "Success",
        message: `Token purchase executed successfully ${result.data?.toString()}`,
      });
      return;
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to execute token purchase",
      });
      return;
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
      <Form.TextField id="inputAmount" title="Amount (in SOL)" placeholder="Enter amount to spend" />
      {txHash && <Detail markdown={`[View on Solscan](https://solscan.io/tx/${txHash})`} />}
    </Form>
  );
}

export default withAccessToken(provider)(BuyTokenForm);
