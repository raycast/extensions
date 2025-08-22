import {
  Action,
  ActionPanel,
  Clipboard,
  Icon,
  List,
  showHUD,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Slip44Entry,
  getSlip44Entries,
  toDecimal,
  fromDecimal,
} from "./slip44";

export default function DecimalConverter(props: {
  arguments?: { amount?: string };
}) {
  const [query, setQuery] = useState(props.arguments?.amount ?? "");
  const [entries, setEntries] = useState<Slip44Entry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getSlip44Entries()
      .then((data) => {
        setEntries(data.filter((e) => e.decimals)); // Only networks with decimals
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleConvert = useCallback(
    async (amount: string, network: Slip44Entry, direction: "to" | "from") => {
      try {
        let result: string;
        if (direction === "to") {
          result = toDecimal(amount, network.decimals!);
          await Clipboard.copy(result);
          await showHUD(
            `${amount} ${network.symbol || network.name} = ${result}`
          );
        } else {
          result = fromDecimal(amount, network.decimals!);
          await Clipboard.copy(result);
          await showHUD(
            `${amount} = ${result} ${network.symbol || network.name}`
          );
        }
      } catch (error) {
        await showHUD("Invalid amount");
      }
    },
    []
  );

  // Filter networks based on search query
  const filteredNetworks = useMemo(() => {
    if (!query) return entries;

    // If query looks like a number, don't filter networks
    if (/^[\d.]+$/.test(query)) {
      return entries;
    }

    // Otherwise filter networks by name/symbol
    return entries.filter(
      (network) =>
        network.name.toLowerCase().includes(query.toLowerCase()) ||
        (network.symbol &&
          network.symbol.toLowerCase().includes(query.toLowerCase()))
    );
  }, [entries, query]);

  const renderNetworkItem = (network: Slip44Entry) => {
    const isNumberQuery = query && /^[\d.]+$/.test(query);

    return (
      <List.Item
        key={`${network.coinType}-${network.name}`}
        title={network.name}
        subtitle={
          network.symbol
            ? `${network.symbol} (${network.decimals} decimals)`
            : `${network.decimals} decimals`
        }
        accessories={[
          { text: `Type: ${network.coinType}` },
          { text: `${network.decimals}d`, icon: Icon.Hashtag },
        ]}
        actions={
          <ActionPanel>
            {isNumberQuery && (
              <>
                <Action
                  title={`Convert ${query} to Decimal`}
                  icon={Icon.Calculator}
                  onAction={() => handleConvert(query, network, "to")}
                  shortcut={{ modifiers: ["cmd"], key: "enter" }}
                />
                <Action
                  title={`Convert ${query} from Decimal`}
                  icon={Icon.Calculator}
                  onAction={() => handleConvert(query, network, "from")}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                />
              </>
            )}
            <Action.CopyToClipboard
              content={network.decimals!.toString()}
              title="Copy Decimal Places"
              icon={Icon.Hashtag}
            />
            <Action.CopyToClipboard
              content={toDecimal("1", network.decimals!)}
              title="Copy 1 Unit in Decimal"
              icon={Icon.Calculator}
            />
            <Action.CopyToClipboard
              content={toDecimal("0.1", network.decimals!)}
              title="Copy 0.1 Unit in Decimal"
              icon={Icon.Calculator}
            />
            <Action.CopyToClipboard
              content={toDecimal("0.5", network.decimals!)}
              title="Copy 0.5 Unit in Decimal"
              icon={Icon.Calculator}
            />
            <Action.CopyToClipboard
              content={toDecimal("10", network.decimals!)}
              title="Copy 10 Units in Decimal"
              icon={Icon.Calculator}
            />
          </ActionPanel>
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
      searchBarPlaceholder="Type amount to convert (e.g., 1.5) or search networks..."
    >
      {query && /^[\d.]+$/.test(query) && (
        <List.Section title={`Convert Amount: ${query}`}>
          <List.Item
            title="Ready to Convert"
            subtitle="Select a network below to convert this amount"
            accessories={[{ text: "Select network →", icon: Icon.ArrowRight }]}
          />
        </List.Section>
      )}

      <List.Section title="Select Network">
        {filteredNetworks.map(renderNetworkItem)}
      </List.Section>
    </List>
  );
}
