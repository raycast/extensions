import { Match } from "./_base";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UUID_NO_HYPHENS_PATTERN = /^[0-9a-f]{32}$/i;
const TXID_64_CHAR_PATTERN = /^[0-9a-f]{64}$/i;

export class TransactionMatch extends Match {
  public match(): boolean {
    const trimmed = this.search.trim();
    if (!trimmed) return false;

    if (UUID_PATTERN.test(trimmed) || UUID_NO_HYPHENS_PATTERN.test(trimmed) || TXID_64_CHAR_PATTERN.test(trimmed)) {
      this.$matched = true;
      return true;
    }

    return false;
  }

  public get matchedNetwork(): "MAINNET" | "REGTEST" | null {
    return this.network;
  }

  public get path(): string {
    return `https://sparkscan.io/tx/${this.search}?${new URLSearchParams({ network: this.network })}`;
  }
}
