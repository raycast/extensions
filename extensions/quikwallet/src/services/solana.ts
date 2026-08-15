import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { AccountLayout, getMint } from "@solana/spl-token";
import { SOLANA_RPC_ENDPOINT, SPL_TOKEN_PROGRAM_ID, KNOWN_TOKENS_MAP } from "../constants";
import { SolanaPriceData, SplTokenBalance } from "../types";

const connection = new Connection(SOLANA_RPC_ENDPOINT);

export async function fetchSolanaPrice(): Promise<SolanaPriceData> {
  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_change=true",
    );
    const data = await response.json();
    return {
      price: data.solana.usd,
      priceChange24h: data.solana.usd_24h_change || 0,
    };
  } catch (error) {
    console.error("Failed to fetch Solana price:", error);
    return {
      price: 0,
      priceChange24h: 0,
    };
  }
}

export async function fetchSolanaBalance(walletAddress: string): Promise<number> {
  const publicKey = new PublicKey(walletAddress);
  const lamports = await connection.getBalance(publicKey);
  return lamports / LAMPORTS_PER_SOL;
}

export async function fetchSplTokenBalances(walletAddress: string): Promise<SplTokenBalance[]> {
  const ownerPublicKey = new PublicKey(walletAddress);
  const tokenAccounts = await connection.getTokenAccountsByOwner(ownerPublicKey, {
    programId: new PublicKey(SPL_TOKEN_PROGRAM_ID),
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
          tokenInfo?.symbol || mintAddress.substring(0, 4) + "..." + mintAddress.substring(mintAddress.length - 4),
        name: tokenInfo?.name || "Unknown Token",
        decimals,
      });
    }
  }

  return fetchedBalances.sort((a, b) => b.uiAmount - a.uiAmount);
}
