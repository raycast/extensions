import { ActionPanel, Action, Form, showToast } from "@raycast/api";
import { useState } from "react";
import { executeAction, ApiParams, provider, createErrorToast, createSuccessToast } from "./utils";
import { withAccessToken, useForm } from "@raycast/utils";
import { validateTokenAddress, validateNumberInput, validateIntegerInput } from "./utils/validation";
import { DCARequest } from "./type";
import { OwnedTokensDropdown } from "./components/owned-tokens-dropdown";
import { SOL, WRAPPED_SOL_ADDRESS } from "./constants/tokenAddress";

function CreateDCA() {
  const [isLoading, setIsLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  const { handleSubmit, itemProps, reset } = useForm<DCARequest>({
    async onSubmit(values) {
      await handleCreateDCA(values);
    },
    validation: {
      inputMint: validateTokenAddress,
      outputMint: validateTokenAddress,
      inAmount: (value) => validateNumberInput(value, "amount"),
      numberOfOrders: (value) => validateIntegerInput(value, "number of orders", 2),
      interval: (value) => validateIntegerInput(value, "interval", 1),
    },
  });

  async function handleCreateDCA(values: DCARequest) {
    try {
      setIsLoading(true);

      const inputMint = values.inputMint === SOL.address ? WRAPPED_SOL_ADDRESS : values.inputMint;
      const outputMint = values.outputMint === SOL.address ? WRAPPED_SOL_ADDRESS : values.outputMint;

      const numberOfOrders = parseInt(values.numberOfOrders);
      const interval = parseInt(values.interval);

      const apiParams: ApiParams = {
        inputMint,
        outputMint,
        inputAmountAllocated: values.inAmount,
        everyTime: interval,
        everyUnit: "minute",
        overOrder: numberOfOrders,
      };

      const result = await executeAction("createDCA", apiParams, false);

      const transactionHash = result.data?.toString() ?? null;
      setTxHash(transactionHash);

      await showToast(
        createSuccessToast(
          "Success",
          `DCA strategy created successfully${transactionHash ? ` - ${transactionHash}` : ""}`,
        ),
      );

      reset();
    } catch (error) {
      await showToast(createErrorToast("Error", error, "Failed to create DCA strategy"));
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
          <Action.SubmitForm title="Create DCA" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <OwnedTokensDropdown
        title="Selling"
        placeholder="Enter input token CA (e.g., SOL)"
        itemProps={itemProps.inputMint}
      />
      <Form.TextField {...itemProps.outputMint} title="Buying" placeholder="Enter output token CA" />
      <Form.TextField {...itemProps.inAmount} title="Allocate" placeholder="Enter amount to allocate" />
      <Form.TextField {...itemProps.numberOfOrders} title="Over" placeholder="Enter total number of orders" />
      <Form.TextField {...itemProps.interval} title="Every" placeholder="Enter interval between orders in minutes" />
    </Form>
  );
}

export default withAccessToken(provider)(CreateDCA);
