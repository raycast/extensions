import { LocalStorage } from "@raycast/api";
import { randomUUID } from "node:crypto";

import { CryptoTransaction, Portfolio, WalletBackup } from "./types";

const PORTFOLIOS_KEY = "cryptowallet.portfolios.v1";
const TRANSACTIONS_KEY = "cryptowallet.transactions.v1";
const MENU_BAR_PORTFOLIO_ID_KEY = "cryptowallet.menuBarPortfolioId.v1";

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await LocalStorage.getItem<string>(key);
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(key: string, value: T): Promise<void> {
  await LocalStorage.setItem(key, JSON.stringify(value));
}

export async function getPortfolios(): Promise<Portfolio[]> {
  const portfolios = await readJson<Portfolio[]>(PORTFOLIOS_KEY, []);
  return portfolios.sort((a, b) => {
    if (a.pinnedAt && !b.pinnedAt) {
      return -1;
    }

    if (!a.pinnedAt && b.pinnedAt) {
      return 1;
    }

    if (a.pinnedAt && b.pinnedAt) {
      return new Date(a.pinnedAt).getTime() - new Date(b.pinnedAt).getTime();
    }

    return a.name.localeCompare(b.name);
  });
}

export async function savePortfolio(input: {
  id?: string;
  name: string;
  description?: string;
  emoji?: string;
}): Promise<Portfolio> {
  const now = new Date().toISOString();
  const portfolios = await getPortfolios();
  const trimmedName = input.name.trim();
  const trimmedDescription = input.description?.trim();
  const trimmedEmoji = input.emoji?.trim();

  if (input.id) {
    const updated = portfolios.map((portfolio) =>
      portfolio.id === input.id
        ? {
            ...portfolio,
            name: trimmedName,
            description: trimmedDescription || undefined,
            emoji: trimmedEmoji || undefined,
            updatedAt: now,
          }
        : portfolio,
    );
    await writeJson(PORTFOLIOS_KEY, updated);
    return updated.find((portfolio) => portfolio.id === input.id) as Portfolio;
  }

  const portfolio: Portfolio = {
    id: randomUUID(),
    name: trimmedName,
    description: trimmedDescription || undefined,
    emoji: trimmedEmoji || undefined,
    createdAt: now,
    updatedAt: now,
  };
  await writeJson(PORTFOLIOS_KEY, [...portfolios, portfolio]);
  return portfolio;
}

export async function setPortfolioPinned(portfolioId: string, isPinned: boolean): Promise<void> {
  const portfolios = await getPortfolios();
  const now = new Date().toISOString();
  await writeJson(
    PORTFOLIOS_KEY,
    portfolios.map((portfolio) =>
      portfolio.id === portfolioId
        ? {
            ...portfolio,
            pinnedAt: isPinned ? portfolio.pinnedAt || now : undefined,
            updatedAt: now,
          }
        : portfolio,
    ),
  );
}

export async function movePinnedPortfolio(portfolioId: string, direction: "up" | "down"): Promise<void> {
  const portfolios = await getPortfolios();
  const pinned = portfolios.filter((portfolio) => portfolio.pinnedAt);
  const index = pinned.findIndex((portfolio) => portfolio.id === portfolioId);
  const targetIndex = direction === "up" ? index - 1 : index + 1;

  if (index < 0 || targetIndex < 0 || targetIndex >= pinned.length) {
    return;
  }

  const current = pinned[index];
  const target = pinned[targetIndex];
  const currentPinnedAt = current.pinnedAt;
  const targetPinnedAt = target.pinnedAt;

  await writeJson(
    PORTFOLIOS_KEY,
    portfolios.map((portfolio) => {
      if (portfolio.id === current.id) {
        return { ...portfolio, pinnedAt: targetPinnedAt };
      }

      if (portfolio.id === target.id) {
        return { ...portfolio, pinnedAt: currentPinnedAt };
      }

      return portfolio;
    }),
  );
}

export async function deletePortfolio(portfolioId: string): Promise<void> {
  const [portfolios, transactions] = await Promise.all([getPortfolios(), getTransactions()]);
  const menuBarPortfolioId = await getMenuBarPortfolioId();
  await Promise.all([
    writeJson(
      PORTFOLIOS_KEY,
      portfolios.filter((portfolio) => portfolio.id !== portfolioId),
    ),
    writeJson(
      TRANSACTIONS_KEY,
      transactions.filter((transaction) => transaction.portfolioId !== portfolioId),
    ),
    menuBarPortfolioId === portfolioId ? setMenuBarPortfolioId(undefined) : Promise.resolve(),
  ]);
}

export async function getMenuBarPortfolioId(): Promise<string | undefined> {
  const value = await LocalStorage.getItem<string>(MENU_BAR_PORTFOLIO_ID_KEY);
  return value || undefined;
}

export async function setMenuBarPortfolioId(portfolioId: string | undefined): Promise<void> {
  if (!portfolioId) {
    await LocalStorage.removeItem(MENU_BAR_PORTFOLIO_ID_KEY);
    return;
  }

  await LocalStorage.setItem(MENU_BAR_PORTFOLIO_ID_KEY, portfolioId);
}

export async function getTransactions(): Promise<CryptoTransaction[]> {
  const transactions = await readJson<CryptoTransaction[]>(TRANSACTIONS_KEY, []);
  return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function saveTransaction(
  input: Omit<CryptoTransaction, "id" | "createdAt" | "updatedAt"> & { id?: string },
): Promise<CryptoTransaction> {
  const now = new Date().toISOString();
  const transactions = await getTransactions();
  const existingTransaction = input.id ? transactions.find((transaction) => transaction.id === input.id) : undefined;
  const normalized: CryptoTransaction = {
    ...input,
    id: input.id || randomUUID(),
    assetSymbol: input.assetSymbol.trim().toUpperCase(),
    assetName: input.assetName.trim(),
    currency: input.currency || existingTransaction?.currency || "USD",
    notes: input.notes?.trim() || undefined,
    createdAt: input.id ? existingTransaction?.createdAt || now : now,
    updatedAt: now,
  };

  const updated = input.id
    ? transactions.map((transaction) => (transaction.id === input.id ? normalized : transaction))
    : [normalized, ...transactions];

  await writeJson(TRANSACTIONS_KEY, updated);
  return normalized;
}

export async function deleteTransaction(transactionId: string): Promise<void> {
  const transactions = await getTransactions();
  await writeJson(
    TRANSACTIONS_KEY,
    transactions.filter((transaction) => transaction.id !== transactionId),
  );
}

export async function createBackup(portfolioIds?: string[]): Promise<WalletBackup> {
  const [portfolios, transactions] = await Promise.all([getPortfolios(), getTransactions()]);
  const selectedPortfolioIds = new Set(
    portfolioIds?.length ? portfolioIds : portfolios.map((portfolio) => portfolio.id),
  );

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    portfolios: portfolios.filter((portfolio) => selectedPortfolioIds.has(portfolio.id)),
    transactions: transactions.filter((transaction) => selectedPortfolioIds.has(transaction.portfolioId)),
  };
}

export async function importBackup(backup: WalletBackup): Promise<void> {
  if (backup.version !== 1 || !Array.isArray(backup.portfolios) || !Array.isArray(backup.transactions)) {
    throw new Error("Unsupported or invalid CryptoWallet backup.");
  }

  const [existingPortfolios, existingTransactions] = await Promise.all([getPortfolios(), getTransactions()]);
  const portfoliosById = new Map(existingPortfolios.map((portfolio) => [portfolio.id, portfolio]));
  const transactionsById = new Map(existingTransactions.map((transaction) => [transaction.id, transaction]));

  backup.portfolios.forEach((portfolio) => portfoliosById.set(portfolio.id, portfolio));
  backup.transactions.forEach((transaction) => transactionsById.set(transaction.id, transaction));

  await Promise.all([
    writeJson(PORTFOLIOS_KEY, Array.from(portfoliosById.values())),
    writeJson(TRANSACTIONS_KEY, Array.from(transactionsById.values())),
  ]);
}
