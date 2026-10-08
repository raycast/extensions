import { Detail } from "@raycast/api";
import { useGasPrices } from "./hooks/gasTrackerHooks";

export default function Command() {
  const { gasPrices, isLoading } = useGasPrices();

  const renderMarkdown = () => {
    const title = "## Ethereum Gas Tracker\n";
    const tableHeader = `
| Type       | High | Average | Low |
|------------|------|---------|-----|
`;

    const tableRows = gasPrices
      .map((price) => {
        const typeName = price.gas_type;
        if (typeName === "Base") {
          price.gas_type = "ETH Send";
        }
        const fastUsd = price.fast_usd ? `$${parseFloat(price.fast_usd).toFixed(2)}` : "N/A";
        const normalUsd = price.normal_usd ? `$${parseFloat(price.normal_usd).toFixed(2)}` : "N/A";
        const slowUsd = price.slow_usd ? `$${parseFloat(price.slow_usd).toFixed(2)}` : "N/A";
        return `| ${price.gas_type} | ${fastUsd} | ${normalUsd} | ${slowUsd} |`;
      })
      .join("\n");

    return `${title}${tableHeader}${tableRows}`;
  };

  return <Detail isLoading={isLoading} markdown={isLoading ? "Loading..." : renderMarkdown() || "No data available"} />;
}
