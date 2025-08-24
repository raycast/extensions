import { Detail, Color } from "@raycast/api";
import { useMacroData } from "./hooks/macroHooks";
import { MacroData, MarketData } from "./types/macroType";

export default function Command() {
  const { macroData, isLoading } = useMacroData();

  const formatInflow = (inflow: string | null) => {
    if (inflow === null) return "N/A";
    const value = parseFloat(inflow);
    const arrow = value > 0 ? "&uarr;" : "&darr;";
    const formattedValue = `${value > 0 ? "+" : ""}$${value.toFixed(2)} M ${arrow}`;
    return formattedValue;
  };

  const formatChange = (change: string | null) => {
    if (change === null || change === undefined) return { text: "N/A", color: Color.Magenta };
    const value = parseFloat(change);
    const arrow = value > 0 ? "&uarr;" : "&darr;";
    const color = value > 0 ? Color.Green : Color.Red;
    return { text: `${value > 0 ? "+" : ""}${value.toFixed(2)}% ${arrow}`, color };
  };

  const renderMarkdown = () => {
    if (!macroData) return "";

    const etfSection = `
### ETF Inflows - ${macroData.btc_etf.date}
- <img src="../assets/bitcoin.png" alt="BTC" width="16" height="16"/> **BTC ETF**: ${formatInflow(macroData.btc_etf.inflow)}
- <img src="../assets/ethereum.png" alt="ETH" width="16" height="16"/> **ETH ETF**: ${formatInflow(macroData.eth_etf.inflow)}
`;

    const marketSection = `
### Macro Data
${["sp500", "gold", "silver", "brent", "nvidia", "apple"]
  .map((key) => {
    const displayName = key;
    const marketData = macroData[key as keyof MacroData] as MarketData;
    const change = formatChange(marketData.change_1d);
    const imageUrl = `../assets/${displayName}.png`; // Путь к изображению
    return `- <img src="${imageUrl}" alt="${displayName.toUpperCase()}" width="16" height="16"/> **${displayName.toUpperCase()}**: ${marketData.price ? `$${parseFloat(marketData.price).toFixed(2)}` : "N/A"}, ${change.text}`;
  })
  .join("\n")}
`;

    return `${etfSection}\n${marketSection}`;
  };

  return <Detail isLoading={isLoading} markdown={isLoading ? "Loading..." : renderMarkdown() || "No data available"} />;
}
