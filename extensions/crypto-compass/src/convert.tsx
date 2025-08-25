import {
  Action,
  ActionPanel,
  Clipboard,
  Icon,
  List,
  getPreferenceValues,
  showHUD,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Slip44Entry,
  getSlip44Entries,
  matchEntries,
  toDecimal,
  fromDecimal,
} from "./slip44";

type Preferences = {
  showTestnets: boolean;
};

export default function Command(props: { arguments?: { query?: string } }) {
  const [query, setQuery] = useState(props.arguments?.query ?? "");
  const [entries, setEntries] = useState<Slip44Entry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [conversionInputs, setConversionInputs] = useState<
    Record<string, { amount: string; decimal: string }>
  >({});
  const prefs = getPreferenceValues<Preferences>();

  useEffect(() => {
    getSlip44Entries()
      .then((data) => {
        console.log("Loaded entries:", data.length);
        console.log("Sample entries:", data.slice(0, 3));
        setEntries(data.filter((e) => e.decimals)); // Only networks with decimals
        // Initialize conversion inputs
        const inputs: Record<string, { amount: string; decimal: string }> = {};
        data.forEach((entry) => {
          inputs[`${entry.coinType}-${entry.name}`] = {
            amount: "1",
            decimal: "",
          };
        });
        setConversionInputs(inputs);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const results = useMemo(
    () => matchEntries(entries, query, prefs.showTestnets),
    [entries, query, prefs.showTestnets]
  );

  const getSearchPlaceholder = () => {
    if (
      query.toLowerCase().includes("erc") ||
      query.toLowerCase().includes("trc")
    ) {
      return "Searching token standards...";
    }
    const basePlaceholder =
      "Type network name, coin type, or token standard (e.g., ethereum, bitcoin, tron, 60, erc20)";
    if (!prefs.showTestnets) {
      return `${basePlaceholder} (testnets hidden)`;
    }
    return basePlaceholder;
  };

  const renderAccessories = (entry: Slip44Entry) => {
    const accessories = [];

    // Add coin type
    accessories.push({ text: `NetworkId: ${entry.coinType}` });

    // Add network type if available
    if (entry.networkType) {
      accessories.push({
        text: entry.networkType,
        icon:
          entry.networkType === "mainnet"
            ? Icon.Checkmark
            : Icon.ExclamationMark,
      });
    }

    // Add token standards if available
    if (entry.tokenStandards && entry.tokenStandards.length > 0) {
      accessories.push({
        text: entry.tokenStandards.join(", "),
        icon: Icon.Tag,
      });
    }

    // Add decimals if available
    if (entry.decimals) {
      accessories.push({
        text: `${entry.decimals}d`,
        icon: Icon.Hashtag,
      });
    }

    return accessories;
  };

  const renderSubtitle = (entry: Slip44Entry) => {
    const parts = [];

    if (entry.symbol) {
      parts.push(entry.symbol);
    }

    return parts.length > 0 ? parts.join(" • ") : undefined;
  };

  const renderConversionFields = (entry: Slip44Entry) => {
    if (!entry.decimals) return null;

    const key = `${entry.coinType}-${entry.name}`;
    const input = conversionInputs[key] || { amount: "1", decimal: "" };

    return (
      <List.Item.Detail
        metadata={
          <List.Item.Detail.Metadata>
            <List.Item.Detail.Metadata.Label title="Decimal Conversion" />
            <List.Item.Detail.Metadata.Label
              title="Amount"
              text={entry.symbol || entry.name}
            />
            <List.Item.Detail.Metadata.Label
              title="Decimal Places"
              text={entry.decimals.toString()}
            />
            <List.Item.Detail.Metadata.Separator />
            <List.Item.Detail.Metadata.Label
              title="Human Amount"
              text={input.amount}
            />
            <List.Item.Detail.Metadata.Label
              title="Decimal Amount"
              text={input.decimal}
            />
          </List.Item.Detail.Metadata>
        }
      />
    );
  };

  return (
    <List
      isLoading={isLoading}
      searchText={query}
      onSearchTextChange={setQuery}
      throttle
      searchBarPlaceholder={getSearchPlaceholder()}
    >
      {results.map((e) => (
        <List.Item
          key={`${e.coinType}-${e.name}`}
          title={e.name}
          subtitle={renderSubtitle(e)}
          accessories={renderAccessories(e)}
          detail={renderConversionFields(e)}
          actions={
            <ActionPanel>
              {e.decimals && (
                <>
                  <Action.Push
                    title="Convert Custom Amount"
                    icon={Icon.Calculator}
                    target={<CustomConversionForm network={e} />}
                  />
                </>
              )}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

// Custom Conversion Form Component
function CustomConversionForm({ network }: { network: Slip44Entry }) {
  const [amount, setAmount] = useState("");
  const [decimalAmount, setDecimalAmount] = useState("");
  const [coinPrice, setCoinPrice] = useState("");
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);
  const [lastPriceUpdate, setLastPriceUpdate] = useState<string>("");

  // Add cache state with timestamp
  const [priceCache, setPriceCache] = useState<{
    price: string;
    timestamp: number;
    symbol: string;
  } | null>(null);

  // Cache TTL: 1 minute = 60,000 milliseconds
  const CACHE_TTL = 60 * 1000;

  // Check if cache is valid
  const isCacheValid = useMemo(() => {
    if (!priceCache || priceCache.symbol !== network.symbol) return false;
    return Date.now() - priceCache.timestamp < CACHE_TTL;
  }, [priceCache, network.symbol]);

  // Handler functions for amount and decimal conversion
  const handleAmountChange = useCallback(
    (network: Slip44Entry, value: string) => {
      console.log(`handleAmountChange called with: "${value}"`);
      setAmount(value);
      if (value && !isNaN(Number(value))) {
        try {
          const result = toDecimal(value, network.decimals!);
          console.log(`toDecimal result: "${result}"`);
          // Format the result to avoid scientific notation
          const formattedResult = formatLargeNumber(result);
          console.log(`formatLargeNumber result: "${formattedResult}"`);
          setDecimalAmount(formattedResult);
        } catch (error) {
          console.error("Conversion error:", error);
          setDecimalAmount("Invalid amount");
        }
      } else {
        setDecimalAmount("");
      }
    },
    []
  );

  const handleDecimalChange = useCallback(
    (network: Slip44Entry, value: string) => {
      setDecimalAmount(value);
      if (value && !isNaN(Number(value))) {
        try {
          const result = fromDecimal(value, network.decimals!);
          setAmount(result);
        } catch (error) {
          setAmount("Invalid decimal");
        }
      } else {
        setAmount("");
      }
    },
    []
  );

  // Fetch real-time coin price from the internet
  const fetchCoinPrice = useCallback(async () => {
    if (!network.symbol) {
      console.log("No symbol available for this network");
      return;
    }

    // Check cache first
    if (isCacheValid && priceCache) {
      console.log(
        `Using cached price for ${network.symbol}: $${priceCache.price}`
      );
      setCoinPrice(priceCache.price);
      setLastPriceUpdate(
        `Cached - ${new Date(priceCache.timestamp).toLocaleTimeString()}`
      );
      return;
    }

    // Prevent multiple simultaneous fetches
    if (isLoadingPrice) {
      console.log("Price fetch already in progress");
      return;
    }

    setIsLoadingPrice(true);
    try {
      console.log(`Starting price fetch for ${network.symbol}`);

      // Try multiple APIs for better reliability
      const apis = [
        `https://api.coingecko.com/api/v3/simple/price?ids=${getCoinGeckoId(
          network.symbol
        )}&vs_currencies=usd`,
        `https://api.coinpaprika.com/v1/tickers/${getCoinPaprikaId(
          network.symbol
        )}`,
        `https://api.binance.com/api/v3/ticker/price?symbol=${network.symbol}USDT`,
      ];

      let price = null;
      let source = "";

      for (const api of apis) {
        try {
          console.log(`Trying API: ${api}`);
          const response = await fetch(api, {
            headers: {
              "User-Agent": "CryptoCompass/1.0",
            },
          });

          if (response.ok) {
            const data = await response.json();
            console.log(`API response:`, data);

            // Parse different API responses
            if (api.includes("coingecko")) {
              const coinId = getCoinGeckoId(network.symbol);
              if (data[coinId]?.usd) {
                price = data[coinId].usd;
                source = "CoinGecko";
                console.log(`Found price from CoinGecko: $${price}`);
                break;
              }
            } else if (api.includes("coinpaprika")) {
              if (data.quotes?.USD?.price) {
                price = data.quotes.USD.price;
                source = "CoinPaprika";
                console.log(`Found price from CoinPaprika: $${price}`);
                break;
              }
            } else if (api.includes("binance")) {
              if (data.price) {
                price = parseFloat(data.price);
                source = "Binance";
                console.log(`Found price from Binance: $${price}`);
                break;
              }
            }
          } else {
            console.log(`API failed with status: ${response.status}`);
          }
        } catch (error) {
          console.log(`API failed: ${api}`, error);
          continue;
        }
      }

      if (price) {
        const priceString = price.toString();
        setCoinPrice(priceString);
        setLastPriceUpdate(`${source} - ${new Date().toLocaleTimeString()}`);

        // Cache the successful result
        setPriceCache({
          price: priceString,
          timestamp: Date.now(),
          symbol: network.symbol,
        });

        console.log(
          `Successfully fetched and cached price: $${price} from ${source}`
        );
      } else {
        console.log("Failed to fetch price from all APIs");
        // Set a fallback price to prevent errors
        setCoinPrice("0");
        setLastPriceUpdate("Failed - Using fallback");
      }
    } catch (error) {
      console.error("Error fetching price:", error);
      // Set fallback values on error
      setCoinPrice("0");
      setLastPriceUpdate("Error - Using fallback");
    } finally {
      setIsLoadingPrice(false);
    }
  }, [network.symbol, isLoadingPrice, isCacheValid, priceCache]);

  // Helper function to get CoinGecko ID
  const getCoinGeckoId = (symbol: string): string => {
    const mapping: Record<string, string> = {
      BTC: "bitcoin",
      ETH: "ethereum",
      BNB: "binancecoin",
      TRX: "tron",
      SOL: "solana",
      ADA: "cardano",
      DOT: "polkadot",
      LINK: "chainlink",
      LTC: "litecoin",
      DOGE: "dogecoin",
      XRP: "ripple",
      MATIC: "matic-network",
      AVAX: "avalanche-2",
      UNI: "uniswap",
      ATOM: "cosmos",
      FTM: "fantom",
      NEAR: "near",
      ALGO: "algorand",
      VET: "vechain",
      ICP: "internet-computer",
    };
    return mapping[symbol] || symbol.toLowerCase();
  };

  // Helper function to get CoinPaprika ID
  const getCoinPaprikaId = (symbol: string): string => {
    const mapping: Record<string, string> = {
      BTC: "btc-bitcoin",
      ETH: "eth-ethereum",
      BNB: "bnb-binance-coin",
      TRX: "trx-tron",
      SOL: "sol-solana",
      ADA: "ada-cardano",
      DOT: "dot-polkadot",
      LINK: "link-chainlink",
      LTC: "ltc-litecoin",
      DOGE: "doge-dogecoin",
      XRP: "xrp-xrp",
      MATIC: "matic-polygon",
      AVAX: "avax-avalanche",
      UNI: "uni-uniswap",
      ATOM: "atom-cosmos",
      FTM: "ftm-fantom",
      NEAR: "near-near-protocol",
      ALGO: "algo-algorand",
      VET: "vet-vechain",
      ICP: "icp-internet-computer",
    };
    return mapping[symbol] || `${symbol.toLowerCase()}-${symbol.toLowerCase()}`;
  };

  // Test the toDecimal function to make sure it's working
  useEffect(() => {
    const testResult = toDecimal("2", network.decimals!);
    console.log(
      `Test conversion: 2 with ${network.decimals} decimals = ${testResult}`
    );
  }, [network.decimals]);

  // Automatically fetch price when component mounts or network changes
  useEffect(() => {
    if (network.symbol) {
      console.log(`Auto-fetching price for ${network.symbol}`);

      // If cache is valid, use it immediately
      if (isCacheValid && priceCache) {
        console.log(`Using cached price for ${network.symbol}`);
        setCoinPrice(priceCache.price);
        setLastPriceUpdate(
          `Cached - ${new Date(priceCache.timestamp).toLocaleTimeString()}`
        );
        return;
      }

      // Add a small delay to prevent immediate execution that might cause issues
      const timer = setTimeout(() => {
        fetchCoinPrice();
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [network.symbol]); // Remove fetchCoinPrice from dependencies to prevent infinite loops

  // Calculate USD value
  const calculateUSDValue = useCallback(() => {
    if (
      amount &&
      coinPrice &&
      !isNaN(Number(amount)) &&
      !isNaN(Number(coinPrice))
    ) {
      const usdValue = parseFloat(amount) * parseFloat(coinPrice);
      return usdValue.toFixed(2);
    }
    return null;
  }, [amount, coinPrice]);

  // Helper function to format large numbers without scientific notation
  const formatLargeNumber = (num: string): string => {
    // Just return the input directly - no conversion needed
    return num;
  };

  const usdValue = calculateUSDValue();

  return (
    <List
      searchBarPlaceholder={`Type amount to convert for ${
        network.symbol || network.name
      }`}
      onSearchTextChange={(text) => {
        try {
          // Handle both amount and decimal input
          if (text.includes(".")) {
            // Likely a human amount
            handleAmountChange(network, text);
          } else if (text.length > 10) {
            // Likely a decimal amount
            handleDecimalChange(network, text);
          } else {
            // Could be either, try both
            handleAmountChange(network, text);
            handleDecimalChange(network, text);
          }
        } catch (error) {
          console.error("Error handling search text change:", error);
        }
      }}
    >
      <List.Section title="Live Conversion">
        <List.Item
          title="Type Amount Above"
          subtitle={amount || "Enter amount in search bar"}
          accessories={[{ text: "Human → Decimal" }]}
          detail={
            <List>
              <List.Item
                title="Human Amount"
                subtitle={amount || "Type above"}
              />
              <List.Item
                title="Decimal Result"
                subtitle={decimalAmount || "Will appear here"}
              />
            </List>
          }
          actions={
            <ActionPanel>
              <Action
                title="Convert Amount to Decimal"
                icon={Icon.Calculator}
                onAction={() => handleAmountChange(network, amount)}
                shortcut={{ modifiers: ["cmd"], key: "enter" }}
              />
              <Action
                title="Convert Decimal to Amount"
                icon={Icon.Calculator}
                onAction={() => handleDecimalChange(network, decimalAmount)}
                shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
              />
              <Action
                title="Copy Converted Amount"
                icon={Icon.Clipboard}
                onAction={async () => {
                  if (amount) {
                    await Clipboard.copy(amount);
                    await showHUD(`Copied human amount: ${amount}`);
                  } else {
                    await showHUD("No amount to copy");
                  }
                }}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action
                title="Copy Decimal Result"
                icon={Icon.Clipboard}
                onAction={async () => {
                  if (decimalAmount) {
                    await Clipboard.copy(decimalAmount);
                    await showHUD(`Copied decimal result: ${decimalAmount}`);
                  } else {
                    await showHUD("No decimal result to copy");
                  }
                }}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Type Decimal Above"
          subtitle={decimalAmount || "Enter decimal in search bar"}
          accessories={[{ text: "Decimal → Human" }]}
          detail={
            <List>
              <List.Item
                title="Decimal Amount"
                subtitle={decimalAmount || "Type above"}
              />
              <List.Item
                title="Human Result"
                subtitle={amount || "Will appear here"}
              />
            </List>
          }
          actions={
            <ActionPanel>
              <Action
                title="Convert Amount to Decimal"
                icon={Icon.Calculator}
                onAction={() => handleAmountChange(network, amount)}
                shortcut={{ modifiers: ["cmd"], key: "enter" }}
              />
              <Action
                title="Convert Decimal to Amount"
                icon={Icon.Calculator}
                onAction={() => handleDecimalChange(network, decimalAmount)}
                shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
              />
              <Action
                title="Copy Converted Decimal"
                icon={Icon.Clipboard}
                onAction={async () => {
                  if (decimalAmount) {
                    await Clipboard.copy(decimalAmount);
                    await showHUD(`Copied decimal amount: ${decimalAmount}`);
                  } else {
                    await showHUD("No decimal amount to copy");
                  }
                }}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action
                title="Copy Human Result"
                icon={Icon.Clipboard}
                onAction={async () => {
                  if (amount) {
                    await Clipboard.copy(amount);
                    await showHUD(`Copied human result: ${amount}`);
                  } else {
                    await showHUD("No human result to copy");
                  }
                }}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Price to USDT Converter">
        <List.Item
          title="Enter Coin Price (USD)"
          subtitle={coinPrice ? `$${coinPrice}` : "Type coin price in USD"}
          accessories={[
            { text: "Price → USDT" },
            { text: isLoadingPrice ? "⏳" : "📡", icon: Icon.Download },
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Fetch Live Price"
                icon={Icon.Download}
                onAction={fetchCoinPrice}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
              <Action
                title="Set Price from Search"
                icon={Icon.Calculator}
                onAction={() => {
                  // This will use the search text as the price
                  if (amount && !isNaN(Number(amount))) {
                    setCoinPrice(amount);
                    setAmount("");
                  }
                }}
                shortcut={{ modifiers: ["cmd"], key: "p" }}
              />
              <Action.CopyToClipboard
                content={coinPrice || "0"}
                title="Copy Current Price"
                icon={Icon.Clipboard}
              />
            </ActionPanel>
          }
        />

        {lastPriceUpdate && (
          <List.Item
            title="Last Price Update"
            subtitle={lastPriceUpdate}
            accessories={[{ text: "Live Data" }]}
          />
        )}

        {!coinPrice && network.symbol && (
          <List.Item
            title="Auto-fetching Price..."
            subtitle="Getting live price from the internet"
            accessories={[{ text: "⏳" }]}
          />
        )}

        {usdValue && (
          <List.Item
            title="USD Value"
            subtitle={`${amount} ${
              network.symbol || network.name
            } = $${usdValue} USDT`}
            accessories={[{ text: "Value" }]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  content={usdValue}
                  title="Copy Usd Value"
                  icon={Icon.Calculator}
                />
                <Action.CopyToClipboard
                  content={`${amount} ${
                    network.symbol || network.name
                  } = $${usdValue} USDT`}
                  title="Copy Full Conversion"
                  icon={Icon.Clipboard}
                />
              </ActionPanel>
            }
          />
        )}
      </List.Section>

      <List.Section title="Quick Actions">
        <List.Item
          title="Fetch Live Price"
          subtitle={isLoadingPrice ? "Loading..." : "Get current market price"}
          accessories={[{ text: isLoadingPrice ? "⏳" : "📡" }]}
          actions={
            <ActionPanel>
              <Action
                title="Fetch Live Price"
                icon={Icon.Download}
                onAction={fetchCoinPrice}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
