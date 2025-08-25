export abstract class Match {
  /**
   * The search string to match.
   */
  public readonly search: string;
  /**
   * The network to match the search string against or use as a default.
   */
  public network: "MAINNET" | "REGTEST";

  /**
   * Whether the search string matched the matcher.
   */
  protected $matched = false;

  /**
   * Create a new matcher.
   * @param search - The search string to match.
   * @param network - The network to match the search string against or use as a default.
   */
  public constructor(search: string, network: "MAINNET" | "REGTEST") {
    this.search = search;
    this.network = network;
  }

  /**
   * Match the search string against the matcher.
   * @returns True if the search string matches the matcher, false otherwise.
   */
  public abstract match(): boolean;
  /**
   * Get whether the search string matched the matcher.
   * @returns True if the search string matched the matcher, false otherwise.
   */
  public get matched(): boolean {
    return this.$matched;
  }
  /**
   * Get the network that the search string matched.
   * @returns The network that the search string matched, or null if no network was matched.
   */
  public abstract get matchedNetwork(): "MAINNET" | "REGTEST" | null;

  /**
   * Get the path to the resource that the search string matched.
   * @returns The path to the resource that the search string matched.
   */
  public abstract get path(): string;
}

export type Matchers = Match[];
