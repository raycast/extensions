import { ActionPanel, Action, Form, LaunchProps } from "@raycast/api";
import { useEffect, useState } from "react";
import { withAccessToken } from "@raycast/utils";
import { isAddress } from "@solana/kit";
import TradingAPI, { SolMint } from "./api/trading";
import { provider } from "./auth/provider";
import { toastError, toastSuccess } from "./utils/toast";
import { useSolana } from "./hooks/solana";

interface BuyTokenFormValues {
  tokenMint: string;
  inputAmount: string;
}

function BuyToken(props: LaunchProps<{ arguments: BuyTokenFormValues }>) {
  const [isLoading, setIsLoading] = useState(false);
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const { getSolScanURL } = useSolana();

  useEffect(() => {
    const { tokenMint, inputAmount } = props.arguments;
    if (tokenMint && inputAmount) {
      handleSubmit({ tokenMint, inputAmount });
    }
  }, [props.arguments.tokenMint, props.arguments.inputAmount]);

  async function handleSubmit(values: BuyTokenFormValues) {
    if (isLoading) {
      return;
    }

    try {
      const inputAmount = parseFloat(values.inputAmount);

      // Validation
      if (isNaN(inputAmount) || inputAmount <= 0) {
        await toastError(new Error("invalid input amount"), {
          title: "Invalid amount",
          message: "amount must be a number greater than 0",
        });
        return;
      }

      if (!isAddress(values.tokenMint)) {
        await toastError(new Error("invalid token mint"), {
          title: "Invalid token",
          message: "token must be a valid address",
        });
        return;
      }

      setIsLoading(true);

      // Execute transaction
      const result = await TradingAPI.swap({
        input_mint: SolMint,
        output_mint: values.tokenMint,
        swap_mode: "ExactIn",
        amount: inputAmount,
      });

      setTxSignature(result.tx_signature);

      await toastSuccess({
        title: "Success",
        message: `Bought token${result.tx_signature ? ` - ${result.tx_signature}` : ""}`,
      });
    } catch (error) {
      await toastError(error, {
        title: "Error",
        message: "Failed to buy token",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      searchBarAccessory={
        txSignature ? <Form.LinkAccessory target={getSolScanURL(txSignature)} text="View on Solscan" /> : null
      }
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Buy" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="tokenMint"
        title="Token Address"
        placeholder="Enter token address"
        defaultValue={props.arguments.tokenMint}
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
