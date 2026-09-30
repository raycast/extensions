import { ActionPanel, Action, Form, showToast, Toast, Image } from "@raycast/api";
import { useEffect, useMemo, useState, useCallback } from "react";
import { ApiParams, executeAction } from "./utils/api-wrapper";
import { provider } from "./utils/auth";
import { withAccessToken, useForm } from "@raycast/utils";
import { isValidSolanaAddress } from "./utils/is-valid-address";
import { LimitOrderRequest, PortfolioToken, TokenInfo } from "./type";
import { OwnedTokensDropdown } from "./components/owned-tokens-dropdown";
import { SOL, USDC, WRAPPED_SOL_ADDRESS } from "./constants/tokenAddress";
import { convertUsdAmountToSol } from "./utils/convert-usd-amount-to-sol";

// In this component primary token is SOL or USDC, secondary token is the other token being traded

function CreateLimitOrder() {
  const [isLoading, setIsLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [inputMintValue, setInputMintValue] = useState<"sol" | "usdc" | "other">("other");
  const [secondaryTokenInfo, setSecondaryTokenInfo] = useState<TokenInfo | undefined>(undefined);
  const [secondaryTokenSolPrice, setSecondaryTokenSolPrice] = useState<number | undefined>(undefined);

  const { handleSubmit, itemProps, setValue } = useForm<LimitOrderRequest>({
    async onSubmit(values) {
      await handleCreateLimitOrder(values);
    },
    validation: {
      inputMint: (value) => {
        if (!value || value.trim() === "") {
          return "Please enter a valid input token address";
        }
      },
      outputMint: (value) => {
        if (!value || value.trim() === "") {
          return "Please enter a valid output token address";
        }
        if (!isValidSolanaAddress(value) && value !== SOL.address) {
          return "Please enter a valid output token address";
        }
      },
      makingAmount: (value) => {
        if (!value || value.trim() === "") {
          return "Please enter a valid amount";
        }
        const amount = parseFloat(value);
        if (isNaN(amount) || amount <= 0) {
          return "Please enter a valid amount greater than 0";
        }
      },
      triggerPrice: (value) => {
        if (!value || value.trim() === "") {
          return "Please enter a valid amount";
        }
        const amount = parseFloat(value);
        if (isNaN(amount) || amount <= 0) {
          return "Please enter a valid amount greater than 0";
        }
      },
    },
  });

  const isInputMintSolOrUsdc = useMemo(() => inputMintValue === "sol" || inputMintValue === "usdc", [inputMintValue]);

  const isPrimaryMintSol = useMemo(
    () => itemProps.inputMint.value === SOL.address || itemProps.outputMint.value === SOL.address,
    [itemProps.inputMint.value, itemProps.outputMint.value],
  );

  const getSecondaryTokenAddress = useCallback(() => {
    if (isInputMintSolOrUsdc && itemProps.outputMint.value) {
      return itemProps.outputMint.value;
    }
    if (!isInputMintSolOrUsdc && itemProps.inputMint.value) {
      return itemProps.inputMint.value;
    }
    return null;
  }, [isInputMintSolOrUsdc, itemProps.inputMint.value, itemProps.outputMint.value]);

  const formatPrice = useCallback(
    (price: number | undefined) => {
      if (!price) return "0";
      return isPrimaryMintSol ? price.toFixed(8) : price.toFixed(6);
    },
    [isPrimaryMintSol],
  );

  const loadSecondaryTokenInfo = useCallback(async () => {
    const tokenAddress = getSecondaryTokenAddress();

    if (!tokenAddress || !isValidSolanaAddress(tokenAddress)) {
      setSecondaryTokenInfo(undefined);
      setSecondaryTokenSolPrice(undefined);
      return;
    }

    try {
      const { data: tokenInfo } = await executeAction<TokenInfo>(
        "getToken",
        {
          inputMint: tokenAddress,
        },
        false,
        1000 * 60,
      );

      setSecondaryTokenInfo(tokenInfo);

      const tokenPriceInSol = await convertUsdAmountToSol({ usdAmount: tokenInfo?.price ?? 0 });
      setSecondaryTokenSolPrice(tokenPriceInSol);

      // const triggerPriceValue = isPrimaryMintSol
      //   ? (tokenPriceInSol?.toFixed(8) ?? "0")
      //   : (tokenInfo?.price.toFixed(6) ?? "0");

      // setValue("triggerPrice", triggerPriceValue);
    } catch {
      setSecondaryTokenInfo(undefined);
      setSecondaryTokenSolPrice(undefined);
    }
  }, [getSecondaryTokenAddress, isPrimaryMintSol]);

  useEffect(() => {
    loadSecondaryTokenInfo();
  }, [loadSecondaryTokenInfo]);

  const handleCreateLimitOrder = useCallback(
    async (values: LimitOrderRequest) => {
      if (isLoading) {
        return;
      }
      try {
        setIsLoading(true);

        if (!secondaryTokenInfo) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Error",
            message: "Token not found",
          });
          return;
        }

        const takingAmount = isInputMintSolOrUsdc
          ? parseFloat(values.makingAmount) / parseFloat(values.triggerPrice)
          : parseFloat(values.makingAmount) * parseFloat(values.triggerPrice);

        const inputMint = values.inputMint === SOL.address ? WRAPPED_SOL_ADDRESS : values.inputMint;
        const outputMint = values.outputMint === SOL.address ? WRAPPED_SOL_ADDRESS : values.outputMint;

        const apiParams: ApiParams = {
          inputMint: inputMint,
          outputMint: outputMint,
          makingAmount: values.makingAmount.toString(),
          takingAmount: takingAmount.toString(),
        };

        if (values.expiredAt) {
          apiParams.expiredAt = Math.floor(values.expiredAt.getTime() / 1000);
        }

        const result = await executeAction("createLO", apiParams);
        const txHashResult = result.data?.toString() ?? null;
        setTxHash(txHashResult);

        await showToast({
          style: Toast.Style.Success,
          title: "Success",
          message: `Limit order created successfully${txHashResult ? ` ${txHashResult}` : ""}`,
        });
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: error instanceof Error ? error.message : "Failed to create limit order",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [secondaryTokenInfo, isPrimaryMintSol, isInputMintSolOrUsdc],
  );

  const handleInputMintChange = useCallback(
    (value: PortfolioToken | undefined) => {
      const mintType = value?.address === SOL.address ? "sol" : value?.address === USDC.address ? "usdc" : "other";
      setInputMintValue(mintType);
      setValue("outputMint", "");
    },
    [setValue],
  );

  const currentPrice = isPrimaryMintSol ? secondaryTokenSolPrice : secondaryTokenInfo?.price;
  const priceUnit = isPrimaryMintSol ? "SOL" : "USD";

  useEffect(() => {
    setValue("triggerPrice", (formatPrice(currentPrice) ?? 0).toString());
  }, [currentPrice]);

  return (
    <Form
      isLoading={isLoading}
      searchBarAccessory={
        txHash ? <Form.LinkAccessory target={`https://solscan.io/tx/${txHash}`} text="View on Solscan" /> : null
      }
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Limit Order" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <OwnedTokensDropdown
        onChange={handleInputMintChange}
        title="Selling"
        placeholder="Enter input token CA"
        itemProps={itemProps.inputMint}
      />

      {isInputMintSolOrUsdc ? (
        <Form.TextField {...itemProps.outputMint} title="Buying" placeholder="Enter output token CA" />
      ) : (
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
      )}

      <Form.TextField {...itemProps.makingAmount} title="Selling Amount" placeholder="Enter amount of selling token" />

      <Form.Description
        title=""
        text={`Market price of ${secondaryTokenInfo?.name ?? "token"} is ${formatPrice(currentPrice)} ${priceUnit}`}
      />

      <Form.TextField
        {...itemProps.triggerPrice}
        onChange={(value) => {
          setValue("triggerPrice", value);
        }}
        title={isInputMintSolOrUsdc ? "Buy when price is" : "Sell when price is"}
        placeholder={
          isInputMintSolOrUsdc
            ? "Enter price of buying token at which you want to execute order"
            : "Enter price of selling token at which you want to execute order"
        }
      />

      <Form.Description
        title=""
        text={`Trade will be executed when ${
          isInputMintSolOrUsdc ? "token you are buying" : "token you are selling"
        } is at price ${formatPrice(parseFloat(itemProps.triggerPrice.value ?? "0"))} ${priceUnit}`}
      />
    </Form>
  );
}

export default withAccessToken(provider)(CreateLimitOrder);
