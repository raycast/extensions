import { ActionPanel, Action, Form, LaunchProps } from "@raycast/api";
import { useState } from "react";
import { withAccessToken, useForm } from "@raycast/utils";
import { toastError, toastSuccess } from "./utils/toast";
import { TokensDropdown } from "./components/TokensDropdown";
import { provider } from "./auth/provider";
import TradingAPI, { SolMint } from "./api/trading";
import { PortfolioToken } from "./api/wallet";
import { useSolana } from "./hooks/solana";

interface SellTokenFormValues {
  inputMint: string;
  inputAmount: string;
}
interface SellTokenProps {
  inputMint?: string;
  inputAmount?: string;
}

function SellToken(props: LaunchProps<{ arguments: SellTokenProps }>) {
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { getSolScanURL } = useSolana();

  const { handleSubmit, itemProps, reset, setValue, ...formProps } = useForm<SellTokenFormValues>({
    async onSubmit(values) {
      if (isLoading) {
        return;
      }
      try {
        setIsLoading(true);
        const inputAmount = parseFloat(values.inputAmount);

        const result = await TradingAPI.swap({
          input_mint: values.inputMint,
          output_mint: SolMint,
          swap_mode: "ExactIn",
          amount: inputAmount,
        });

        setTxSignature(result.tx_signature);

        await toastSuccess({
          title: "Success",
          message: "Submitted transaction",
        });
        reset();
      } catch (error) {
        await toastError(error, { title: "Error", message: "Error executing token sale" });
      } finally {
        setIsLoading(false);
      }
    },
    validation: {
      inputMint: (value) => {
        if (!value || value.trim() === "") {
          return "Please select a token from your portfolio";
        }
      },
      inputAmount: (value) => {
        if (!value || value.trim() === "") {
          return "Please enter an amount";
        }
        const amount = parseFloat(value);
        if (isNaN(amount) || amount <= 0) {
          return "Please enter a valid amount greater than 0";
        }
      },
    },
    initialValues: {
      inputMint: props.arguments.inputMint ?? "",
      inputAmount: props.arguments.inputAmount ?? "",
    },
  });

  const handleInputMintChange = async (value: PortfolioToken | undefined) => {
    const tokenBalance = value?.amount_float;
    setValue("inputAmount", tokenBalance?.toString() ?? "");
  };

  return (
    <Form
      isLoading={isLoading}
      searchBarAccessory={
        txSignature ? <Form.LinkAccessory target={getSolScanURL(txSignature)} text="View on Solscan" /> : null
      }
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Sell" onSubmit={handleSubmit} />
        </ActionPanel>
      }
      {...formProps}
    >
      <TokensDropdown
        onChange={handleInputMintChange}
        title="Token"
        placeholder="Select token from portfolio"
        itemProps={itemProps.inputMint}
        excludeSol={true}
      />
      <Form.TextField {...itemProps.inputAmount} title="Amount" placeholder="Enter amount to sell" />
    </Form>
  );
}

export default withAccessToken(provider)(SellToken);
