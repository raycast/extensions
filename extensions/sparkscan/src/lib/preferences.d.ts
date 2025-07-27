export interface Preferences {
  /**
   * The default network to use.
   */
  defaultNetwork: "MAINNET" | "REGTEST";
  /**
   * Whether to show details in the latest transactions list.
   */
  defaultDetails: boolean;
  /**
   * The default limit for the latest transactions list.
   */
  transactionLimit: string;
}
