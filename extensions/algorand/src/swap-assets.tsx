import { ActionPanel, Action, Form, showToast, Toast, Icon, useNavigation, Detail } from "@raycast/api";
import { useState, useEffect } from "react";
import { WalletService } from "./services/wallet-service";

interface SwapAsset {
  asset_id: number;
  name: string;
  unit_name: string;
  logo: string;
  fraction_decimals: number;
  usd_value: string | null;
  is_verified: boolean;
  verification_tier: "verified" | "unverified" | "suspicious";
}

interface SwapQuote {
  quote_id_str: string;
  provider: string;
  asset_in: SwapAsset;
  asset_out: SwapAsset;
  amount_in: string;
  amount_out: string;
  amount_out_with_slippage: string;
  slippage: string;
  price: string;
  price_impact: string;
  pera_fee_amount: string;
  exchange_fee_amount: string;
}

export default function SwapAssets() {
  const [isLoading, setIsLoading] = useState(false);
  const [fromAsset, setFromAsset] = useState<SwapAsset | null>(null);
  const [toAsset, setToAsset] = useState<SwapAsset | null>(null);
  const [fromAmount, setFromAmount] = useState("");
  const [slippage, setSlippage] = useState("0.5");
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [availableAssets, setAvailableAssets] = useState<SwapAsset[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [step, setStep] = useState<"setup" | "quote" | "confirm" | "result">("setup");
  const [result, setResult] = useState<{ txId: string; confirmedRound: number } | null>(null);
  const { pop } = useNavigation();
  const walletService = WalletService.getInstance();

  useEffect(() => {
    initializeSwap();
  }, []);

  useEffect(() => {
    if (fromAsset) {
      loadAvailableAssets();
    }
  }, [fromAsset]);

  const initializeSwap = async () => {
    try {
      const wallet = await walletService.getOrCreateWallet();
      setWalletAddress(wallet.address);

      // Set ALGO as default from asset
      const algoAsset: SwapAsset = {
        asset_id: 0,
        name: "Algorand",
        unit_name: "ALGO",
        logo: "",
        fraction_decimals: 6,
        usd_value: null,
        is_verified: true,
        verification_tier: "verified",
      };
      setFromAsset(algoAsset);
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Failed to initialize swap",
      });
    }
  };

  const loadAvailableAssets = async () => {
    if (!fromAsset) return;

    try {
      const assets = await walletService.getAvailableSwapAssets(fromAsset.asset_id);
      setAvailableAssets(assets);
    } catch (error) {
      console.error("Error loading available assets:", error);
    }
  };

  const searchAssets = async (query: string) => {
    if (!query.trim()) {
      if (fromAsset) {
        loadAvailableAssets();
      }
      return;
    }

    try {
      const assets = await walletService.searchSwapAssets(query);
      setAvailableAssets(assets);
    } catch (error) {
      console.error("Error searching assets:", error);
    }
  };

  const getSwapQuote = async () => {
    if (!fromAsset || !toAsset || !fromAmount || !walletAddress) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Missing Information",
        message: "Please select assets and enter amount",
      });
      return;
    }

    setIsLoading(true);
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Getting Quote...",
        message: "Fetching best swap rates",
      });

      // Convert amount to base units
      const amountInBaseUnits = (parseFloat(fromAmount) * Math.pow(10, fromAsset.fraction_decimals)).toString();
      const slippageDecimal = (parseFloat(slippage) / 100).toString();

      const swapQuote = await walletService.getSwapQuote(
        fromAsset.asset_id,
        toAsset.asset_id,
        amountInBaseUnits,
        walletAddress,
        slippageDecimal,
      );

      setQuote(swapQuote);
      setStep("quote");

      await showToast({
        style: Toast.Style.Success,
        title: "Quote Retrieved",
        message: "Review your swap details",
      });
    } catch (error) {
      console.error("Error getting quote:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Quote Failed",
        message: error instanceof Error ? error.message : "Failed to get swap quote",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const executeSwap = async () => {
    if (!quote) return;

    setIsLoading(true);
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Executing Swap...",
        message: "Please wait while we process your swap",
      });

      const wallet = await walletService.getOrCreateWallet();
      const swapResult = await walletService.executeSwap(quote.quote_id_str, wallet.mnemonic);

      setResult(swapResult);
      setStep("result");

      await showToast({
        style: Toast.Style.Success,
        title: "Swap Successful!",
        message: `Transaction confirmed in round ${swapResult.confirmedRound}`,
      });
    } catch (error) {
      console.error("Error executing swap:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Swap Failed",
        message: error instanceof Error ? error.message : "Failed to execute swap",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatAmount = (amount: string, decimals: number): string => {
    const num = parseFloat(amount) / Math.pow(10, decimals);
    return num.toFixed(Math.min(decimals, 6));
  };

  if (step === "result" && result) {
    const markdown = `# ✅ Swap Successful!

## Transaction Details
- **Transaction ID**: \`${result.txId}\`
- **Confirmed Round**: ${result.confirmedRound}
- **From**: ${formatAmount(quote?.amount_in || "0", fromAsset?.fraction_decimals || 6)} ${fromAsset?.unit_name}
- **To**: ${formatAmount(quote?.amount_out || "0", toAsset?.fraction_decimals || 6)} ${toAsset?.unit_name}
- **Provider**: ${quote?.provider}

## 🌐 View Transaction
[View on AlgoExplorer](https://lora.algokit.io/testnet/tx/${result.txId})

---

Your swap has been successfully executed on the Algorand testnet using Tinyman DEX.`;

    return (
      <Detail
        navigationTitle="Swap Complete"
        markdown={markdown}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Transaction ID" content={result.txId} icon={Icon.CopyClipboard} />
            <Action.OpenInBrowser
              title="View on Algoexplorer"
              url={`https://lora.algokit.io/testnet/tx/${result.txId}`}
              icon={Icon.Globe}
            />
            <Action
              title="New Swap"
              onAction={() => {
                setStep("setup");
                setQuote(null);
                setResult(null);
                setFromAmount("");
              }}
              icon={Icon.ArrowClockwise}
            />
            <Action title="Back to Wallet" onAction={pop} icon={Icon.ArrowLeft} />
          </ActionPanel>
        }
      />
    );
  }

  if (step === "quote" && quote) {
    const priceImpact = parseFloat(quote.price_impact);
    const priceImpactColor = priceImpact > 5 ? "🔴" : priceImpact > 2 ? "🟡" : "🟢";

    const markdown = `# 💱 Swap Quote

## Trade Details
- **From**: ${formatAmount(quote.amount_in, quote.asset_in.fraction_decimals)} ${quote.asset_in.unit_name}
- **To**: ${formatAmount(quote.amount_out_with_slippage, quote.asset_out.fraction_decimals)} ${quote.asset_out.unit_name}
- **Provider**: ${quote.provider}

## Price Information
- **Rate**: 1 ${quote.asset_in.unit_name} = ${parseFloat(quote.price).toFixed(6)} ${quote.asset_out.unit_name}
- **Price Impact**: ${priceImpactColor} ${quote.price_impact}%
- **Slippage**: ${(parseFloat(quote.slippage) * 100).toFixed(2)}%

## Fees
- **Tinyman Fee (0.3%)**: ${formatAmount(quote.exchange_fee_amount, quote.asset_in.fraction_decimals)} ${quote.asset_in.unit_name}

---

**⚠️ Important**: Review all details carefully before confirming. Swaps are irreversible once executed.`;

    return (
      <Detail
        navigationTitle="Review Swap"
        markdown={markdown}
        actions={
          <ActionPanel>
            <Action title="Confirm Swap" onAction={executeSwap} icon={Icon.Check} style={Action.Style.Destructive} />
            <Action title="Back to Setup" onAction={() => setStep("setup")} icon={Icon.ArrowLeft} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      navigationTitle="Swap Assets"
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action title="Get Quote" onAction={getSwapQuote} icon={Icon.MagnifyingGlass} />
          <Action title="Cancel" onAction={pop} icon={Icon.XMarkCircle} />
        </ActionPanel>
      }
    >
      <Form.Description
        text={`Swap assets using Tinyman DEX on Algorand testnet\nWallet: ${walletAddress.slice(0, 8)}...${walletAddress.slice(-8)}`}
      />

      <Form.Separator />

      <Form.TextField
        id="fromAmount"
        title="Amount"
        placeholder="Enter amount to swap"
        value={fromAmount}
        onChange={setFromAmount}
        error={
          fromAmount && (isNaN(parseFloat(fromAmount)) || parseFloat(fromAmount) <= 0)
            ? "Amount must be a positive number"
            : undefined
        }
      />

      <Form.Dropdown
        id="fromAsset"
        title="From Asset"
        value={fromAsset?.asset_id.toString() || ""}
        onChange={(value) => {
          if (value === "0") {
            setFromAsset({
              asset_id: 0,
              name: "Algorand",
              unit_name: "ALGO",
              logo: "",
              fraction_decimals: 6,
              usd_value: null,
              is_verified: true,
              verification_tier: "verified",
            });
          }
        }}
      >
        <Form.Dropdown.Item value="0" title="ALGO (Algorand)" icon={Icon.Circle} />
      </Form.Dropdown>

      <Form.TextArea
        id="searchAssets"
        title="Search Assets"
        placeholder="Search for assets to swap to..."
        value={searchQuery}
        onChange={(value) => {
          setSearchQuery(value);
          searchAssets(value);
        }}
      />

      <Form.Dropdown
        id="toAsset"
        title="To Asset"
        value={toAsset?.asset_id.toString() || ""}
        onChange={(value) => {
          const asset = availableAssets.find((a) => a.asset_id.toString() === value);
          if (asset) {
            setToAsset(asset);
          }
        }}
      >
        <Form.Dropdown.Item value="" title="Select an asset..." />
        {availableAssets.map((asset) => (
          <Form.Dropdown.Item
            key={asset.asset_id}
            value={asset.asset_id.toString()}
            title={`${asset.unit_name} (${asset.name})`}
            icon={asset.is_verified ? Icon.CheckCircle : Icon.Circle}
          />
        ))}
      </Form.Dropdown>

      <Form.Dropdown id="slippage" title="Slippage Tolerance" value={slippage} onChange={setSlippage}>
        <Form.Dropdown.Item value="0.1" title="0.1% (Low)" />
        <Form.Dropdown.Item value="0.5" title="0.5% (Normal)" />
        <Form.Dropdown.Item value="1.0" title="1.0% (High)" />
        <Form.Dropdown.Item value="3.0" title="3.0% (Very High)" />
      </Form.Dropdown>

      <Form.Separator />

      <Form.Description text="💡 Tips:" />
      <Form.Description text="• Lower slippage = better price but higher chance of failure" />
      <Form.Description text="• Higher slippage = more likely to succeed but potentially worse price" />
      <Form.Description text="• Verified assets are recommended for safety" />
    </Form>
  );
}
