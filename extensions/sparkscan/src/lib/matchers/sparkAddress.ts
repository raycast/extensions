import { Match } from "./_base";

export class SparkAddressMatch extends Match {
  public match(): boolean {
    const trimmed = this.search.trim();
    if (!trimmed) return false;

    const lower = trimmed.toLowerCase();
    if (lower.startsWith("sp") && lower.includes("1") && lower.length > 10) {
      this.$matched = true;
      const sparkNetworkChar = lower.charAt(2);

      switch (sparkNetworkChar) {
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
    return `https://sparkscan.io/address/${this.search}?${new URLSearchParams({ network: this.network })}`;
  }
}
