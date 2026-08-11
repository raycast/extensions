import { ActionPanel, List, Action } from "@raycast/api";
import { useState } from "react";
import { useCachedPromise } from "@raycast/utils";
import { ethers } from "ethers";

// Use Llama RPC - reliable and no auth required
const provider = new ethers.JsonRpcProvider("https://eth.llamarpc.com");

export default function Command() {
  const [query, setQuery] = useState("");

  const { data: result, isLoading } = useCachedPromise(
    async (searchQuery: string) => {
      if (!searchQuery) return null;
      return await performLookup(searchQuery);
    },
    [query],
    {
      execute: query.length > 0,
      keepPreviousData: true,
    },
  );

  const isAddress = query.startsWith("0x");
  const showResult = result !== null && result !== undefined;

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={(value) => setQuery(value)}
      searchBarPlaceholder="Search by ENS name (e.g., vitalik.eth) or Ethereum address (0x...)"
      throttle
    >
      {showResult && result && (
        <List.Section title={isAddress ? "Reverse Lookup Result" : "ENS Resolution Result"}>
          {isAddress ? (
            // Address lookup - show ENS name if found
            <>
              <List.Item
                title="ENS Name"
                accessoryTitle={result || "Not found"}
                actions={result ? <ENSActions ens={result} /> : undefined}
              />
              <List.Item title="Address" accessoryTitle={query} actions={<AddressActions address={query} />} />
            </>
          ) : (
            // ENS name lookup - show address
            <>
              <List.Item title="ENS Name" accessoryTitle={query} actions={<ENSActions ens={query} />} />
              <List.Item
                title="Resolved Address"
                accessoryTitle={result || "Not found"}
                actions={result ? <AddressActions address={result} /> : undefined}
              />
            </>
          )}
        </List.Section>
      )}

      {!showResult && query.length > 0 && !isLoading && (
        <List.EmptyView
          title="No results found"
          description={
            isAddress ? "This address does not have an ENS name set" : "ENS name not found or could not be resolved"
          }
        />
      )}
    </List>
  );
}

async function performLookup(query: string): Promise<string | null> {
  try {
    // Check if input is an address (starts with 0x and is 42 chars)
    if (query.startsWith("0x") && query.length === 42) {
      // Reverse lookup: address -> ENS name
      const name = await provider.lookupAddress(query);
      return name;
    } else if (query.endsWith(".eth")) {
      // Forward resolution: ENS name -> address
      const address = await provider.resolveName(query);
      return address;
    }
    return null;
  } catch (error) {
    console.error("ENS lookup error:", error);
    return null;
  }
}

function AddressActions({ address }: { address: string }) {
  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.OpenInBrowser title="View on Etherscan" url={`https://etherscan.io/address/${address}`} />
        <Action.CopyToClipboard title="Copy Address" content={address} shortcut={{ modifiers: ["cmd"], key: "." }} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function ENSActions({ ens }: { ens: string }) {
  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.OpenInBrowser title="View on Etherscan" url={`https://etherscan.io/enslookup-search?search=${ens}`} />
        <Action.CopyToClipboard title="Copy ENS Name" content={ens} shortcut={{ modifiers: ["cmd"], key: "." }} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
