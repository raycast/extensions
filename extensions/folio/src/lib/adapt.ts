/**
 * Adapts SnapTrade's newer /accounts/{id}/positions/all schema onto the Position / OptionsPosition
 * shapes the UI and the pure portfolio math consume. Pure: no Raycast imports, unit-tested.
 */
import type { Account, AccountHoldings, AccountPosition, Balance, OptionsPosition, Position } from "./types";

function num(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

const KIND_LABEL: Record<string, string> = {
  stock: "Common Stock",
  etf: "ETF",
  adr: "ADR",
  cef: "Closed End Fund",
  crypto: "Cryptocurrency",
  mutualfund: "Mutual Fund",
  future: "Future",
  cfd: "CFD",
  bond: "Bond",
  option: "Option",
};

/** Maps one entry of /positions/all onto the Position / OptionsPosition shapes the rest of Folio consumes. */
export function adaptPosition(p: AccountPosition, account: Account): { position?: Position; option?: OptionsPosition } {
  const i = p.instrument;
  const units = num(p.units) ?? 0;
  const price = num(p.price);
  const cost = num(p.cost_basis);
  const currency = (p.currency ?? i.currency ?? account.balance.total?.currency ?? "USD").toUpperCase();
  if (i.kind === "option") {
    const multiplier = num(i.multiplier) ?? 100;
    const underlying = i.underlying?.symbol ?? i.raw_symbol ?? i.symbol;
    return {
      option: {
        symbol: {
          id: i.id,
          description:
            i.description ??
            `${underlying} ${i.strike_price ?? ""} ${i.option_type ?? ""} ${i.expiration_date ?? ""}`.trim(),
          option_symbol: {
            id: i.id,
            ticker: i.symbol,
            option_type: i.option_type ?? "CALL",
            strike_price: num(i.strike_price) ?? 0,
            expiration_date: i.expiration_date ?? "",
            underlying_symbol: {
              id: `underlying-${i.id}`,
              symbol: underlying,
              raw_symbol: i.underlying?.raw_symbol ?? underlying,
              description: i.underlying?.description ?? undefined,
              currency: { code: currency },
            },
          },
        },
        price,
        units,
        // cost_basis is per share; the UI treats average_purchase_price as per contract.
        average_purchase_price: cost !== null ? cost * multiplier : null,
        currency: { code: currency },
        multiplier,
      },
    };
  }
  return {
    position: {
      symbol: {
        id: i.id,
        description: i.description ?? "",
        symbol: {
          id: i.id,
          symbol: i.symbol,
          raw_symbol: i.raw_symbol ?? i.symbol,
          description: i.description ?? undefined,
          currency: { code: currency },
          exchange: i.exchange ? { code: i.exchange } : undefined,
          type: { code: i.kind, description: KIND_LABEL[i.kind] ?? i.kind },
        },
      },
      units,
      price,
      average_purchase_price: cost,
      open_pnl: price !== null && cost !== null ? (price - cost) * units : null,
      currency: { code: currency },
      cash_equivalent: Boolean(p.cash_equivalent),
    },
  };
}

export function buildHoldings(account: Account, balances: Balance[], positions: AccountPosition[]): AccountHoldings {
  const out: AccountHoldings = { account, balances, positions: [], option_positions: [] };
  for (const p of positions) {
    const { position, option } = adaptPosition(p, account);
    if (position) out.positions!.push(position);
    if (option) out.option_positions!.push(option);
  }
  return out;
}
