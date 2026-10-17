import { ActionPanel, Action, Form, showToast, LaunchProps } from "@raycast/api";
import { useEffect, useState } from "react";
import { executeAction, provider, createErrorToast, createSuccessToast, isValidSolanaAddress } from "./utils";
import { showFailureToast, withAccessToken, useForm } from "@raycast/utils";
import { OwnedTokensDropdown } from "./components/owned-tokens-dropdown";
import { PortfolioToken } from "./type";

interface SellTokenFormValues {
  inputMint: string;
  inputAmount: string;
}
interface SellTokenProps {
  inputMint?: string;
  inputAmount?: string;
  dontAutoExecute?: boolean;
}

function SellToken(props: LaunchProps<{ arguments: SellTokenProps }>) {
  const [txHash, setTxHash] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [portfolioRefreshKey, setPortfolioRefreshKey] = useState(0);

  const { handleSubmit, itemProps, reset, setValue, ...formProps } = useForm<SellTokenFormValues>({
    async onSubmit(values) {
      if (isLoading) {
        return;
      }
      try {
        setIsLoading(true);
        const inputAmount = parseFloat(values.inputAmount);

        // Validation (should be redundant with useForm validation, but kept for safety)
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
        setPortfolioRefreshKey((k) => k + 1); // trigger dropdown refresh
        reset();
      } catch (error) {
        await showFailureToast(error, { title: "Error executing token sale" });
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
  });

  useEffect(() => {
    const { inputMint, inputAmount } = props.arguments;
    if (inputAmount) {
      setValue("inputAmount", inputAmount);
    }
    if (inputMint && !isValidSolanaAddress(inputMint)) {
      showToast(createErrorToast("Invalid token address", "Please enter a valid token mint address"));
      return;
    }
    if (inputMint) {
      setValue("inputMint", inputMint);
    }
    if (props.arguments.dontAutoExecute) {
      return;
    } else if (inputMint && inputAmount) {
      handleSubmit({ inputMint, inputAmount });
    }
  }, [props.arguments.inputMint, props.arguments.inputAmount, handleSubmit, setValue]);

  const handleInputMintChange = async (value: PortfolioToken | undefined) => {
    const tokenBalance = value?.uiAmount;
    setValue("inputAmount", tokenBalance?.toString() ?? "");
  };

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
      {...formProps}
    >
      <OwnedTokensDropdown
        key={portfolioRefreshKey}
        onChange={handleInputMintChange}
        title="Token"
        placeholder="Select token from portfolio"
        itemProps={itemProps.inputMint}
        excludeSol={true}
        refreshKey={portfolioRefreshKey}
      />
      <Form.TextField {...itemProps.inputAmount} title="Amount" placeholder="Enter amount to sell" />
    </Form>
  );
}

export default withAccessToken(provider)(SellToken);
