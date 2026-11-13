import { describe, expect, it, vi } from "vitest";
import type { DayQuote } from "../portfolio";
import type { Position } from "../t212/types";
import { collectDayQuotes } from "./day-quotes";

const position = (ticker: string) => ({ instrument: { ticker } }) as Position;
const quote: DayQuote = { price: 101, previousClose: 100, marketTime: 1 };
const never = () => new Promise<never>(() => {});

describe("collectDayQuotes", () => {
  it("returns symbols and quotes keyed by ticker", async () => {
    const lookup = vi.fn(async (p: Position) =>
      p.instrument.ticker === "A" ? { symbol: "A.L", quote } : { symbol: null },
    );
    const result = await collectDayQuotes([position("A"), position("B")], lookup, { concurrency: 4, budgetMs: 1000 });
    expect(result).toEqual({ symbols: { A: "A.L", B: null }, quotes: { A: quote } });
  });

  it("leaves out positions whose Yahoo lookup hasn't answered within the budget", { timeout: 1000 }, async () => {
    const lookup = (p: Position) => (p.instrument.ticker === "A" ? Promise.resolve({ symbol: "A.L", quote }) : never());
    const result = await collectDayQuotes([position("A"), position("B")], lookup, { concurrency: 4, budgetMs: 20 });
    expect(result).toEqual({ symbols: { A: "A.L" }, quotes: { A: quote } });
  });

  it("starts no new lookups once the budget is spent", { timeout: 1000 }, async () => {
    const lookup = vi.fn(() => never());
    await collectDayQuotes([position("A"), position("B"), position("C")], lookup, { concurrency: 1, budgetMs: 20 });
    expect(lookup).toHaveBeenCalledTimes(1);
  });

  it("leaves out a position whose lookup fails", async () => {
    const lookup = (p: Position) =>
      p.instrument.ticker === "A" ? Promise.resolve({ symbol: "A.L", quote }) : Promise.reject(new Error("boom"));
    const result = await collectDayQuotes([position("A"), position("B")], lookup, { concurrency: 4, budgetMs: 1000 });
    expect(result).toEqual({ symbols: { A: "A.L" }, quotes: { A: quote } });
  });
});
