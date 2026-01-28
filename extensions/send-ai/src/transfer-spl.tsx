import { ActionPanel, Action, Form, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { executeAction } from "./utils/api-wrapper";
import { provider } from "./utils/auth";
import { withAccessToken, useForm } from "@raycast/utils";
import { OwnedTokensDropdown } from "./components/owned-tokens-dropdown";
import { SOL_ADDRESS, WRAPPED_SOL_ADDRESS } from "./get-token-overview";

interface FormValues {
  to: string;
  mintAddress: string;
  amount: string;
}

function TransferSPL() {
  const [isLoading, setIsLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | undefined>(undefined);
  const [portfolioRefreshKey, setPortfolioRefreshKey] = useState(0);

  const { handleSubmit, itemProps, reset } = useForm<FormValues>({
    async onSubmit(values) {
      await handleTransfer(values);
      reset();
      setPortfolioRefreshKey((k) => k + 1); // trigger dropdown refresh
    },
    validation: {
      to: (value) => {
        if (!value || value.trim() === "") {
          return "Please enter a valid wallet address";
        }
      },
      mintAddress: (value) => {
        if (!value || value.trim() === "") {
          return "Please select a token from your portfolio";
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

      let result;

      if (values.mintAddress === WRAPPED_SOL_ADDRESS || values.mintAddress === SOL_ADDRESS) {
        result = await executeAction<{ signature: string }>("transfer", {
          to: values.to,
          amount: amount,
        });
      } else {
        result = await executeAction<{ signature: string }>("transferSPL", {
          to: values.to,
          amount: amount,
          mintAddress: values.mintAddress,
        });
      }

      if (result.status === "error") {
        await showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: result.message,
        });
        setIsLoading(false);
        return;
      }

      await showToast({
        style: Toast.Style.Success,
        title: "Success",
        message: `SPL token transfer executed successfully`,
      });

      setTxHash(result.data?.signature);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to execute SPL token transfer",
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
        txHash ? <Form.LinkAccessory target={`https://solscan.io/tx/${txHash}`} text="View on Solscan" /> : null
      }
    >
      <Form.TextField {...itemProps.to} title="To Address" placeholder="Enter wallet address" />
      <OwnedTokensDropdown
        key={portfolioRefreshKey}
        title="Token"
        placeholder="Select token from portfolio"
        itemProps={itemProps.mintAddress}
        refreshKey={portfolioRefreshKey}
      />
      <Form.TextField {...itemProps.amount} title="Amount" placeholder="Enter amount to transfer" />
    </Form>
  );
}

export default withAccessToken(provider)(TransferSPL);
