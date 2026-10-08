import type { Wallet } from "./types";

export const FAVORITES_KEY = "hyperliquid.favorites";
export const WALLETS_KEY = "hyperliquid.wallets";
export const ACTIVE_WALLET_KEY = "hyperliquid.active-wallet";

interface WalletInput {
  id?: string;
  label: string;
  address: string;
}

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function validateWalletAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address.trim());
}

export function normalizeWalletAddress(address: string): `0x${string}` {
  return address.trim().toLowerCase() as `0x${string}`;
}

function normalizeWallet(input: WalletInput): Wallet | null {
  const label = input.label.trim();
  const address = normalizeWalletAddress(input.address);

  if (!label || !validateWalletAddress(address)) {
    return null;
  }

  return {
    id: input.id?.trim() || createId(),
    label,
    address,
  };
}

export function parseStoredWallets(value: unknown): Wallet[] {
  if (typeof value !== "string") {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.flatMap((item) => {
      if (typeof item !== "object" || item === null) {
        return [];
      }

      const candidate = item as Partial<WalletInput>;
      if (typeof candidate.label !== "string" || typeof candidate.address !== "string") {
        return [];
      }

      const wallet = normalizeWallet({
        id: typeof candidate.id === "string" ? candidate.id : undefined,
        label: candidate.label,
        address: candidate.address,
      });
      return wallet ? [wallet] : [];
    });
  } catch {
    return [];
  }
}

export function serializeWallets(wallets: Wallet[]): string {
  return JSON.stringify(wallets.flatMap((wallet) => normalizeWallet(wallet) ?? []));
}

export function addOrUpdateWallet(wallets: Wallet[], input: WalletInput): Wallet[] {
  const wallet = normalizeWallet(input);
  if (!wallet) {
    return wallets;
  }

  const index = wallets.findIndex(
    (storedWallet) => storedWallet.id === wallet.id || storedWallet.address === wallet.address,
  );
  if (index === -1) {
    return [...wallets, wallet];
  }

  const next = [...wallets];
  next[index] = { ...wallet, id: wallets[index].id };
  return next;
}

export function removeWallet(wallets: Wallet[], id: string): Wallet[] {
  return wallets.filter((wallet) => wallet.id !== id);
}

export function parseStoredFavorites(value: unknown): string[] {
  if (typeof value !== "string") {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return Array.from(
      new Set(
        parsed
          .filter((coin): coin is string => typeof coin === "string" && coin.trim().length > 0)
          .map((coin) => coin.trim().toUpperCase()),
      ),
    ).sort();
  } catch {
    return [];
  }
}

export function serializeFavorites(favorites: string[]): string {
  return JSON.stringify(Array.from(new Set(favorites.map((coin) => coin.trim().toUpperCase()).filter(Boolean))).sort());
}

export function toggleFavoriteCoin(favorites: string[], coin: string): string[] {
  const normalizedCoin = coin.trim().toUpperCase();
  if (!normalizedCoin) {
    return parseStoredFavorites(serializeFavorites(favorites));
  }

  const favoriteSet = new Set(parseStoredFavorites(serializeFavorites(favorites)));
  if (favoriteSet.has(normalizedCoin)) {
    favoriteSet.delete(normalizedCoin);
  } else {
    favoriteSet.add(normalizedCoin);
  }

  return Array.from(favoriteSet).sort();
}
