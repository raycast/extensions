import axios from "axios";
import { Token, TokenList, SearchResult, UserPreferences } from "../types";
import { LocalStorage, showToast, Toast } from "@raycast/api";
import fs from "fs";
import path from "path";

const TOKEN_LIST_BASE_URL =
  "https://raw.githubusercontent.com/SmolDapp/tokenLists/main/lists";
const DEFAULT_CHAIN_ID = 1;
const TOKEN_LIST_DIR = path.join(__dirname, "tokenLists");
const CHAIN_IDS = [1]; // Add other chain IDs as needed
const TOKEN_FILES = [
  "coingecko.json",
  "cowswap.json",
  "curve.json",
  "defillama.json",
  "etherscan.json",
  "paraswap.json",
  "popular.json",
  "tokenlistooor.json",
  "yearn-extended.json",
  "yearn-min.json",
  "yearn.json",
];

const REFRESH_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000; // One week in milliseconds
const MASTER_FILE_PATH = path.join(TOKEN_LIST_DIR, "masterTokenList.json");
const PAGE_SIZE = 25; // Number of results to load at once

export class TokenService {
  private static instance: TokenService;
  private tokenLists: Map<string, TokenList> = new Map();
  private userPreferences: UserPreferences | null = null;
  private favoriteTokensSet: Set<string> = new Set();
  private lastRefresh: number = 0;

  private constructor() {}

  public static getInstance(): TokenService {
    if (!TokenService.instance) {
      TokenService.instance = new TokenService();
    }
    return TokenService.instance;
  }

  public async initialize(): Promise<void> {
    await this.loadUserPreferences();
    await this.refreshTokenListsIfNeeded();
  }

  private async loadUserPreferences(): Promise<void> {
    try {
      const prefs = await LocalStorage.getItem("userPreferences");
      this.userPreferences =
        typeof prefs === "string"
          ? JSON.parse(prefs)
          : {
              favoriteTokens: [],
              enabledChains: [DEFAULT_CHAIN_ID],
              activeTokenLists: [],
              refreshInterval: "daily",
            };

      // Normalize all addresses to lowercase
      if (this.userPreferences.favoriteTokens) {
        this.userPreferences.favoriteTokens =
          this.userPreferences.favoriteTokens.map((address: string) =>
            address.toLowerCase(),
          );
      }

      // Pre-compute favorites Set for faster lookups
      this.favoriteTokensSet = new Set(this.userPreferences.favoriteTokens);
    } catch (error) {
      console.error("Error loading user preferences:", error);
      this.userPreferences = {
        favoriteTokens: [],
        enabledChains: [DEFAULT_CHAIN_ID],
        activeTokenLists: [],
        refreshInterval: "daily",
      };
      this.favoriteTokensSet = new Set();
    }
  }

  private async refreshTokenListsIfNeeded(): Promise<void> {
    const lastRefreshStr = await LocalStorage.getItem("lastRefresh");
    this.lastRefresh = lastRefreshStr ? Number(lastRefreshStr) : 0;
    const now = Date.now();

    if (now - this.lastRefresh > REFRESH_INTERVAL_MS) {
      await this.refreshTokenLists();
      await LocalStorage.setItem("lastRefresh", String(now));
      this.lastRefresh = now;
    }
  }

  private async refreshTokenLists(): Promise<void> {
    const uniqueTokens = new Map<string, Token>();

    // Create directory if it doesn't exist
    if (!fs.existsSync(TOKEN_LIST_DIR)) {
      fs.mkdirSync(TOKEN_LIST_DIR, { recursive: true });
    }

    for (const chainId of CHAIN_IDS) {
      const chainDir = path.join(TOKEN_LIST_DIR, String(chainId));
      if (!fs.existsSync(chainDir)) {
        fs.mkdirSync(chainDir, { recursive: true });
      }

      for (const fileName of TOKEN_FILES) {
        try {
          console.log(
            `Attempting to download ${fileName} for chain ${chainId}...`,
          );
          const response = await axios.get(
            `${TOKEN_LIST_BASE_URL}/${chainId}/${fileName}`,
          );
          const tokenList = response.data;

          // Save to local file
          const filePath = path.join(chainDir, fileName);
          fs.writeFileSync(filePath, JSON.stringify(tokenList, null, 2));

          // Process each token and add to unique tokens map
          for (const token of tokenList.tokens) {
            const normalizedAddress = token.address.toLowerCase();
            const compositeKey = `${chainId}-${normalizedAddress}`;
            if (!uniqueTokens.has(compositeKey)) {
              uniqueTokens.set(compositeKey, {
                ...token,
                address: normalizedAddress,
              });
            }
          }

          console.log(
            `Successfully downloaded and saved ${fileName} for chain ${chainId}.`,
          );

          await showToast({
            style: Toast.Style.Success,
            title: `Downloaded ${fileName}`,
            message: `Token list for chain ${chainId} updated.`,
          });
        } catch (error) {
          console.error(
            `Error fetching ${fileName} for chain ${chainId}:`,
            error,
          );
          await showToast({
            style: Toast.Style.Failure,
            title: `Failed to fetch ${fileName}`,
            message: `Using cached version if available for chain ${chainId}.`,
          });

          // Attempt to load from cache
          const filePath = path.join(chainDir, fileName);
          if (fs.existsSync(filePath)) {
            try {
              const data = fs.readFileSync(filePath, "utf-8");
              const tokenList: TokenList = JSON.parse(data);

              // Process each token from cache
              for (const token of tokenList.tokens) {
                const normalizedAddress = token.address.toLowerCase();
                const compositeKey = `${chainId}-${normalizedAddress}`;
                if (!uniqueTokens.has(compositeKey)) {
                  uniqueTokens.set(compositeKey, {
                    ...token,
                    address: normalizedAddress,
                  });
                }
              }

              console.log(
                `Loaded cached version of ${fileName} for chain ${chainId}.`,
              );
            } catch (readError) {
              console.error(
                `Error reading cached file: ${filePath}`,
                readError,
              );
            }
          }
        }
      }
    }

    // Save the master token list to a single file
    const masterListArray = Array.from(uniqueTokens.values());
    fs.writeFileSync(
      MASTER_FILE_PATH,
      JSON.stringify(masterListArray, null, 2),
    );
    console.log(
      `Master token list saved to ${MASTER_FILE_PATH} with ${masterListArray.length} unique tokens.`,
    );
  }

  public async searchTokens(
    query: string,
    page: number = 0,
  ): Promise<{ results: SearchResult[]; hasMore: boolean }> {
    const searchQuery = query.toLowerCase().trim();

    if (!searchQuery) {
      return { results: [], hasMore: false };
    }

    try {
      // Stream read the file to save memory
      if (!fs.existsSync(MASTER_FILE_PATH)) {
        return { results: [], hasMore: false };
      }

      const data = fs.readFileSync(MASTER_FILE_PATH, "utf-8");
      const tokens: Token[] = JSON.parse(data);

      // Use a Map to deduplicate results
      const resultsMap = new Map<string, SearchResult>();

      // Filter tokens that match the query
      for (const token of tokens) {
        if (
          token.symbol.toLowerCase().includes(searchQuery) ||
          token.name.toLowerCase().includes(searchQuery) ||
          token.address.toLowerCase().includes(searchQuery)
        ) {
          // Normalize the address to lowercase to prevent case-sensitivity issues
          const normalizedAddress = token.address.toLowerCase();
          const compositeKey = `${token.chainId}-${normalizedAddress}`;

          if (!resultsMap.has(compositeKey)) {
            resultsMap.set(compositeKey, {
              token: {
                ...token,
                address: normalizedAddress, // Store normalized address
              },
              isFavorite: this.favoriteTokensSet.has(normalizedAddress),
              lastSelected: await this.getLastSelectedDate(normalizedAddress),
            });
          }
        }
      }

      // Convert to array and sort (favorites first, then by last selected date)
      const allResults = Array.from(resultsMap.values()).sort((a, b) => {
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;
        if (a.lastSelected && b.lastSelected) {
          return b.lastSelected.getTime() - a.lastSelected.getTime();
        }
        // Alphabetical by symbol as final tiebreaker
        return a.token.symbol.localeCompare(b.token.symbol);
      });

      // Calculate pagination info
      const startIndex = page * PAGE_SIZE;
      const endIndex = startIndex + PAGE_SIZE;
      const paginatedResults = allResults.slice(startIndex, endIndex);
      const hasMore = endIndex < allResults.length;

      return { results: paginatedResults, hasMore };
    } catch (error) {
      console.error("Error searching tokens:", error);
      return { results: [], hasMore: false };
    }
  }

  public async toggleFavorite(tokenAddress: string): Promise<void> {
    const normalizedAddress = tokenAddress.toLowerCase();
    const index =
      this.userPreferences.favoriteTokens.indexOf(normalizedAddress);
    if (index === -1) {
      this.userPreferences.favoriteTokens.push(normalizedAddress);
      this.favoriteTokensSet.add(normalizedAddress);
    } else {
      this.userPreferences.favoriteTokens.splice(index, 1);
      this.favoriteTokensSet.delete(normalizedAddress);
    }
    await LocalStorage.setItem(
      "userPreferences",
      JSON.stringify(this.userPreferences),
    );
  }

  private async getLastSelectedDate(
    tokenAddress: string,
  ): Promise<Date | undefined> {
    try {
      const normalizedAddress = tokenAddress.toLowerCase();
      const lastSelected = await LocalStorage.getItem(
        `lastSelected_${normalizedAddress}`,
      );
      return typeof lastSelected === "string"
        ? new Date(JSON.parse(lastSelected))
        : undefined;
    } catch {
      return undefined;
    }
  }

  public async updateLastSelected(tokenAddress: string): Promise<void> {
    const normalizedAddress = tokenAddress.toLowerCase();
    await LocalStorage.setItem(
      `lastSelected_${normalizedAddress}`,
      JSON.stringify(new Date()),
    );
  }
}
