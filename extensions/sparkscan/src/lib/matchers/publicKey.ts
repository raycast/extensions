import { Match } from "./_base";

const PUBLIC_KEY_PATTERN = /^(02|03)[0-9a-fA-F]{64}$/;

export class PublicKeyMatch extends Match {
  public match(): boolean {
    const trimmed = this.search.trim();
    if (!trimmed) return false;

    if (trimmed.length === 66 && PUBLIC_KEY_PATTERN.test(trimmed)) {
      this.$matched = true;
      return true;
    }

    return false;
  }

  public get matchedNetwork(): "MAINNET" | "REGTEST" | null {
    return this.network;
  }

  public get path(): string {
    return `https://sparkscan.io/address/${this.search}?${new URLSearchParams({ network: this.network })}`;
  }
}
