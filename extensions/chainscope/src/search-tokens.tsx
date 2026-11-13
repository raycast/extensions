import { Action, ActionPanel, Color, Icon, List, openExtensionPreferences } from "@raycast/api";
import { useCachedPromise, usePromise } from "@raycast/utils";
import { useState } from "react";
import { fetchEvmTokens, filterEvmTokens, searchSolanaTokens, type Token } from "./lib/tokens";
import { explorerUrl, getSettings, solscanUrl } from "./lib/prefs";
import { withSettings } from "./with-settings";

const CHAIN_OPTIONS: { id: string; title: string; chainId?: number; solana?: boolean }[] = [
  { id: "all", title: "All Chains" },
  { id: "1", title: "Ethereum", chainId: 1 },
  { id: "8453", title: "Base", chainId: 8453 },
  { id: "42161", title: "Arbitrum", chainId: 42161 },
  { id: "10", title: "Optimism", chainId: 10 },
  { id: "137", title: "Polygon", chainId: 137 },
  { id: "56", title: "BNB Chain", chainId: 56 },
  { id: "solana", title: "Solana", solana: true },
];

function Command() {
  const [query, setQuery] = useState("");
  const [chainSel, setChainSel] = useState("all");
  const [showDetail, setShowDetail] = useState(false);

  const opt = CHAIN_OPTIONS.find((o) => o.id === chainSel) ?? CHAIN_OPTIONS[0];
  const wantsEvm = !opt.solana;
  const wantsSolana = !!opt.solana || chainSel === "all";

  const {
    data: evm = [],
    isLoading: evmLoading,
    error: evmError,
    revalidate: retryEvm,
  } = useCachedPromise(fetchEvmTokens, [getSettings().tokenListUrl], {
    execute: wantsEvm,
  });
  const {
    data: sol = [],
    isLoading: solLoading,
    error: solError,
    revalidate: retrySol,
  } = usePromise(searchSolanaTokens, [query, getSettings().jupiterUrl], {
    execute: wantsSolana && query.trim().length >= 2,
  });

  const evmResults = wantsEvm ? filterEvmTokens(evm, query, opt.chainId) : [];
  const results: Token[] = [...evmResults, ...(wantsSolana ? sol : [])];
  const failure =
    wantsEvm && evmError
      ? { error: evmError, retry: retryEvm }
      : wantsSolana && solError
        ? { error: solError, retry: retrySol }
        : null;

  return (
    <List
      searchText={query}
      onSearchTextChange={setQuery}
      isLoading={evmLoading || solLoading}
      filtering={false}
      isShowingDetail={showDetail && results.length > 0}
      searchBarPlaceholder="Search tokens by symbol, name, or address"
      searchBarAccessory={
        <List.Dropdown tooltip="Chain" value={chainSel} onChange={setChainSel}>
          {CHAIN_OPTIONS.map((o) => (
            <List.Dropdown.Item key={o.id} title={o.title} value={o.id} />
          ))}
        </List.Dropdown>
      }
    >
      {results.length === 0 && failure ? (
        <List.EmptyView
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          title="Couldn't load tokens"
          description={failure.error.message.split("\n")[0]}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={failure.retry} />
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      ) : results.length === 0 ? (
        <List.EmptyView
          icon={Icon.Coins}
          title={query ? "No tokens found" : "Search tokens"}
          description="By symbol, name, or address — across EVM chains and Solana"
        />
      ) : (
        results.map((t, i) => (
          <TokenItem
            key={`${t.chain}-${t.address}-${i}`}
            t={t}
            showDetail={showDetail}
            onToggleDetail={() => setShowDetail((v) => !v)}
          />
        ))
      )}
    </List>
  );
}

function priceLabel(p: number): string {
  return `$${p < 1 ? p.toPrecision(3) : p.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function TokenItem({ t, showDetail, onToggleDetail }: { t: Token; showDetail: boolean; onToggleDetail: () => void }) {
  const url = t.chainId
    ? explorerUrl(t.chainId, `token/${t.address}`)
    : solscanUrl("mainnet-beta", `token/${t.address}`);
  const chainColor = t.chain === "Solana" ? Color.Purple : Color.Blue;
  return (
    <List.Item
      icon={t.logoURI ? { source: t.logoURI, fallback: Icon.Coins } : Icon.Coins}
      title={t.symbol}
      subtitle={t.name}
      accessories={
        showDetail
          ? undefined
          : [
              ...(t.priceUsd ? [{ text: priceLabel(t.priceUsd) }] : []),
              { tag: { value: `${t.decimals} dec`, color: Color.SecondaryText } },
              { tag: { value: t.chain, color: chainColor } },
              {
                icon: t.verified
                  ? { source: Icon.CheckCircle, tintColor: Color.Green }
                  : { source: Icon.Warning, tintColor: Color.Orange },
                tooltip: t.verified ? "Verified token" : "Unverified — not on the curated list",
              },
            ]
      }
      detail={
        <List.Item.Detail
          markdown={`${t.logoURI ? `<img src="${t.logoURI}" alt="${t.symbol}" height="84" />\n\n` : ""}# ${t.symbol}\n\n${t.name}`}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Symbol" text={t.symbol} />
              <List.Item.Detail.Metadata.Label title="Name" text={t.name} />
              <List.Item.Detail.Metadata.Label title="Chain" text={t.chain} />
              <List.Item.Detail.Metadata.Label title={t.chainId ? "Address" : "Mint"} text={t.address} />
              <List.Item.Detail.Metadata.Label title="Decimals" text={String(t.decimals)} />
              <List.Item.Detail.Metadata.TagList title="Status">
                <List.Item.Detail.Metadata.TagList.Item
                  text={t.verified ? "verified" : "unverified"}
                  color={t.verified ? Color.Green : Color.Orange}
                />
              </List.Item.Detail.Metadata.TagList>
              {t.priceUsd ? <List.Item.Detail.Metadata.Label title="Price" text={priceLabel(t.priceUsd)} /> : null}
              {t.audit ? <List.Item.Detail.Metadata.Label title="Audit" text={t.audit} /> : null}
              <List.Item.Detail.Metadata.Separator />
              {url ? <List.Item.Detail.Metadata.Link title="Explorer" text="Open token page" target={url} /> : null}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Address" content={t.address} />
          {url ? <Action.OpenInBrowser title="Open in Explorer" url={url} /> : null}
          <Action.Paste title="Paste Address" content={t.address} />
          <Action
            title="Toggle Details"
            icon={Icon.Sidebar}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            onAction={onToggleDetail}
          />
        </ActionPanel>
      }
    />
  );
}

export default withSettings(Command);
