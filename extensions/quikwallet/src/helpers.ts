import { useState, useEffect } from "react";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { AccountLayout, getMint } from "@solana/spl-token";
import { SplTokenBalance, UseSolanaBalanceReturn } from "./types";
import { UseSplTokenBalancesReturn } from "./types";

// Solana network configuration
const SOLANA_RPC_ENDPOINT = "https://api.mainnet-beta.solana.com";

export function useSolanaBalance(walletAddress: string): UseSolanaBalanceReturn {
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!walletAddress) {
      setError("Wallet address is required.");
      setIsLoading(false);
      setBalance(null);
      return;
    }

    async function fetchBalance() {
      setIsLoading(true);
      setError(null);
      try {
        const connection = new Connection(SOLANA_RPC_ENDPOINT);
        const publicKey = new PublicKey(walletAddress);

        const lamports = await connection.getBalance(publicKey);
        setBalance(lamports / LAMPORTS_PER_SOL);
      } catch (err) {
        console.error(`Failed to fetch balance for ${walletAddress}:`, err);
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("An unknown error occurred while fetching balance.");
        }
        setBalance(null);
      } finally {
        setIsLoading(false);
      }
    }

    fetchBalance();
  }, [walletAddress]);

  return { balance, isLoading, error };
}

// Predefined map for common token mints to symbols and names
// Add more tokens here as needed
const KNOWN_TOKENS_MAP: Record<string, { symbol: string; name: string; decimals?: number }> = {
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: {
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
  },
  J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn: {
    symbol: "JitoSOL",
    name: "Jito Staked SOL",
    decimals: 9,
  },
  // Add other known tokens here, e.g., mSOL, BONK, etc.
};

export function useSplTokenBalances(walletAddress: string): UseSplTokenBalancesReturn {
  const [tokenBalances, setTokenBalances] = useState<SplTokenBalance[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!walletAddress) {
      setError("Wallet address is required for SPL tokens.");
      setIsLoading(false);
      setTokenBalances([]);
      return;
    }

    async function fetchTokenBalances() {
      setIsLoading(true);
      setError(null);
      const connection = new Connection(SOLANA_RPC_ENDPOINT);
      const ownerPublicKey = new PublicKey(walletAddress);

      try {
        const tokenAccounts = await connection.getTokenAccountsByOwner(ownerPublicKey, {
          programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"), // SPL Token Program ID
        });

        const fetchedBalances: SplTokenBalance[] = [];

        for (const { account } of tokenAccounts.value) {
          const accountInfo = AccountLayout.decode(account.data);
          const mintAddress = new PublicKey(accountInfo.mint).toBase58();

          const tokenInfo = KNOWN_TOKENS_MAP[mintAddress];
          let decimals = tokenInfo?.decimals;

          if (decimals === undefined) {
            try {
              const mintData = await getMint(connection, new PublicKey(mintAddress));
              decimals = mintData.decimals;
            } catch (e) {
              console.warn(`Could not fetch decimals for mint ${mintAddress}:`, e);
              continue;
            }
          }

          // Skip tokens with undefined decimals to prevent Math.pow() errors
          if (decimals === undefined) {
            console.warn(`Skipping token with undefined decimals: ${mintAddress}`);
            continue;
          }

          const uiAmount = accountInfo.amount ? Number(accountInfo.amount) / Math.pow(10, decimals) : 0;

          if (uiAmount > 0) {
            fetchedBalances.push({
              mintAddress,
              uiAmount,
              symbol:
                tokenInfo?.symbol ||
                mintAddress.substring(0, 4) + "..." + mintAddress.substring(mintAddress.length - 4),
              name: tokenInfo?.name || "Unknown Token",
              decimals,
            });
          }
        }
        setTokenBalances(fetchedBalances.sort((a, b) => b.uiAmount - a.uiAmount));
      } catch (err) {
        console.error(`Failed to fetch token balances for ${walletAddress}:`, err);
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("An unknown error occurred while fetching token balances.");
        }
        setTokenBalances([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchTokenBalances();
  }, [walletAddress]);

  return { tokenBalances, isLoading, error };
}
