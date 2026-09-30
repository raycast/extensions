import { ActionPanel, Action, Form, showToast, Image } from "@raycast/api";
import { useCallback, useMemo, useState } from "react";
import { executeAction, ApiParams, provider, createErrorToast, createSuccessToast } from "./utils";
import { withAccessToken, useForm } from "@raycast/utils";
import { validateTokenAddress, validateNumberInput, validateIntegerInput } from "./utils/validation";
import { DCARequest, PortfolioToken } from "./type";
import { OwnedTokensDropdown } from "./components/owned-tokens-dropdown";
import { SOL, USDC, WRAPPED_SOL_ADDRESS } from "./constants/tokenAddress";

function CreateDCA() {
  const [isLoading, setIsLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [inputMintValue, setInputMintValue] = useState<"sol" | "usdc" | "other">("other");

  const { handleSubmit, itemProps, reset, setValue } = useForm<DCARequest>({
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
      if (isLoading) {
        return;
      }
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

  const isInputMintSolOrUsdc = useMemo(() => inputMintValue === "sol" || inputMintValue === "usdc", [inputMintValue]);

  const handleInputMintChange = useCallback(
    (value: PortfolioToken | undefined) => {
      const mintType = value?.address === SOL.address ? "sol" : value?.address === USDC.address ? "usdc" : "other";
      setInputMintValue(mintType);
      setValue("outputMint", "");
    },
    [setValue],
  );

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
        onChange={handleInputMintChange}
        title="Selling"
        placeholder="Enter input token name"
        itemProps={itemProps.inputMint}
      />
      {!isInputMintSolOrUsdc ? (
        <Form.Dropdown {...itemProps.outputMint} title="Buying" placeholder="Enter output token CA">
          <Form.Dropdown.Item
            value={SOL.address}
            title={SOL.name}
            icon={{ source: SOL.logoURI, mask: Image.Mask.Circle }}
          />
          <Form.Dropdown.Item
            value={USDC.address}
            title={USDC.name}
            icon={{ source: USDC.logoURI, mask: Image.Mask.Circle }}
          />
        </Form.Dropdown>
      ) : (
        <Form.TextField {...itemProps.outputMint} title="Buying" placeholder="Enter output token CA" />
      )}
      <Form.TextField {...itemProps.inAmount} title="Allocate" placeholder="Enter amount to allocate" />
      <Form.TextField {...itemProps.numberOfOrders} title="Over" placeholder="Enter total number of orders" />
      <Form.TextField {...itemProps.interval} title="Every" placeholder="Enter interval between orders in minutes" />
    </Form>
  );
}

export default withAccessToken(provider)(CreateDCA);
