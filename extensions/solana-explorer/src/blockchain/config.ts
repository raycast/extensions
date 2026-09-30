export class BlockchainConfig {
  readonly network: string;
  readonly solanaExplorerUrl: string;

  constructor(network: string, solanaExplorerUrl: string) {
    this.network = network;
    this.solanaExplorerUrl = solanaExplorerUrl;
  }

  static mainnet(): BlockchainConfig {
    return new BlockchainConfig("mainnet-beta", "https://explorer.solana.com");
  }

  static devnet(): BlockchainConfig {
    return new BlockchainConfig("devnet-beta", "https://explorer.solana.com");
  }
}
