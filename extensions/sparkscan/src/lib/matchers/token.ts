import { Match } from "./_base";

export class TokenMatch extends Match {
  public match(): boolean {
    const trimmed = this.search.trim();
    if (!trimmed) return false;

    const lower = trimmed.toLowerCase();
    if (lower.startsWith("btkn") && trimmed.includes("1") && lower.length > 10) {
      this.$matched = true;
      const tokenNetworkChar = lower.charAt(4);

      switch (tokenNetworkChar) {
        case "1":
          this.network = "MAINNET";
          break;
        case "r":
          this.network = "REGTEST";
          break;
      }

      return true;
    }

    return false;
  }

  public get matchedNetwork(): "MAINNET" | "REGTEST" | null {
    return this.network;
  }

  public get path(): string {
    return `https://sparkscan.io/token/${this.search}?${new URLSearchParams({ network: this.network })}`;
  }
}
