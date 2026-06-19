import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Icon,
  List,
  Toast,
  open,
  showToast,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { encodeUsdAmount, type ChainType } from "./cove";
import { getConfig, type Config } from "./config";
import { detectChains, extractContractAddress, type TokenInfo } from "./detect";
import { buildCoveLink } from "./link";
import { resolveChains } from "./resolve";

type TokenContext = {
  ca: string;
  type: ChainType;
  symbol?: string;
  name?: string;
};

type State =
  | { status: "loading" }
  | { status: "empty" }
  | { status: "error"; message: string }
  | { status: "ready"; ctx: TokenContext; chainId: string };

export default function Command() {
  const config = useMemo(() => getConfig(), []);
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const next = await detect();
      if (!cancelled) setState(next);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "loading") {
    return (
      <List
        isLoading
        searchBarPlaceholder="Detecting chain…"
        navigationTitle="CoveCast"
      />
    );
  }

  if (state.status === "empty") {
    return (
      <List navigationTitle="CoveCast">
        <List.EmptyView
          icon={Icon.Clipboard}
          title="No contract address on your clipboard"
          description="Copy a token CA (EVM 0x… or Solana base58) and run this command again."
        />
      </List>
    );
  }

  if (state.status === "error") {
    return (
      <List navigationTitle="CoveCast">
        <List.EmptyView
          icon={Icon.Warning}
          title="Can't open a Cove buy link"
          description={state.message}
        />
      </List>
    );
  }

  return <AmountList config={config} ctx={state.ctx} chainId={state.chainId} />;
}

function AmountList(props: {
  config: Config;
  ctx: TokenContext;
  chainId: string;
}) {
  const { config, ctx, chainId } = props;

  const fire = async (kind: "g" | "b", amount?: number) => {
    try {
      const url = buildCoveLink({
        kind,
        ca: ctx.ca,
        type: ctx.type,
        chainId,
        amount,
        target: "tg",
      });
      await open(url);
      await showToast({
        style: Toast.Style.Success,
        title:
          kind === "g"
            ? `Buying $${amount} ${chainId}`
            : `Opening ${chainId} buy panel`,
        message: shortCa(ctx.ca),
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't build Cove link",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const panelAction = (
    <Action
      title="Open Buy Panel"
      icon={Icon.AppWindow}
      onAction={() => void fire("b")}
    />
  );
  const copyCa = (
    <Action.CopyToClipboard title="Copy Contract Address" content={ctx.ca} />
  );
  const sectionTitle = `${chainId} · ${ctx.symbol ?? "token"}`;

  const amounts = config.amounts.filter(isEncodableAmount);
  const buyIsPrimary = config.defaultBuyAction === "g";

  return (
    <List navigationTitle="CoveCast" searchBarPlaceholder="Pick an amount…">
      <List.Section title={sectionTitle} subtitle={shortCa(ctx.ca)}>
        {amounts.map((amount) => {
          const buy = (
            <Action
              title={`Buy $${amount} Now`}
              icon={{ source: Icon.Coins, tintColor: Color.Green }}
              onAction={() => void fire("g", amount)}
            />
          );
          return (
            <List.Item
              key={amount}
              icon={{ source: Icon.Coins, tintColor: Color.Green }}
              title={`$${amount}`}
              subtitle={buyIsPrimary ? "Immediate buy" : "Open panel"}
              actions={
                <ActionPanel>
                  {buyIsPrimary ? buy : panelAction}
                  {buyIsPrimary ? panelAction : buy}
                  <CopyDeeplinkAction
                    ctx={ctx}
                    chainId={chainId}
                    kind="g"
                    amount={amount}
                  />
                  {copyCa}
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
      {amounts.length === 0 && (
        <List.EmptyView
          icon={Icon.AppWindow}
          title="No valid amounts configured"
          description="Open the Cove buy panel to choose an amount there."
          actions={<ActionPanel>{panelAction}</ActionPanel>}
        />
      )}
    </List>
  );
}

function CopyDeeplinkAction(props: {
  ctx: TokenContext;
  chainId: string;
  kind: "g" | "b";
  amount?: number;
}) {
  let url = "";
  try {
    url = buildCoveLink({
      kind: props.kind,
      ca: props.ctx.ca,
      type: props.ctx.type,
      chainId: props.chainId,
      amount: props.amount,
    });
  } catch {
    return null;
  }
  return (
    <Action.CopyToClipboard
      title="Copy Deeplink"
      content={url}
      shortcut={{ modifiers: ["cmd"], key: "c" }}
    />
  );
}

// ---- detection orchestration --------------------------------------------------

async function detect(): Promise<State> {
  const text = await Clipboard.readText();
  const extracted = extractContractAddress(text);
  if (!extracted) return { status: "empty" };

  let info: TokenInfo | null = null;
  try {
    info = await detectChains(extracted.ca);
  } catch {
    info = null;
  }

  const ctx: TokenContext = {
    ca: extracted.ca,
    type: extracted.type,
    symbol: info?.symbol,
    name: info?.name,
  };

  const resolution = resolveChains(extracted, info);
  switch (resolution.kind) {
    case "none":
      return {
        status: "error",
        message: "No Cove-supported chain detected for this token.",
      };
    case "ready":
      return { status: "ready", ctx, chainId: resolution.chainId };
  }
}

function isEncodableAmount(amount: number): boolean {
  try {
    encodeUsdAmount(amount);
    return true;
  } catch {
    return false;
  }
}

function shortCa(ca: string): string {
  return ca.length <= 12 ? ca : `${ca.slice(0, 6)}…${ca.slice(-4)}`;
}
