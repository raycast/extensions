import { useCachedState } from "@raycast/utils";
import type { Account } from "./gmail";

export function usePinnedAccounts() {
  const [pinnedAccounts, setPinnedAccounts] = useCachedState<string[]>("pinned", []);

  return {
    pinnedAccounts,
    pin: (account: Account) => setPinnedAccounts((prev) => [...prev, account.email]),
    unpin: (account: Account) => setPinnedAccounts((prev) => prev.filter((email) => email !== account.email)),
    unpinAll: () => setPinnedAccounts([]),
    moveUp: (account: Account) =>
      setPinnedAccounts((prev) => {
        const i = prev.indexOf(account.email);
        prev.splice(i - 1, 2, prev[i], prev[i - 1]);
        return prev;
      }),
    moveDown: (account: Account) =>
      setPinnedAccounts((prev) => {
        const i = prev.indexOf(account.email);
        prev.splice(i, 2, prev[i + 1], prev[i]);
        return prev;
      }),
    getAllowedMovements: (account: Account) => getAllowedMovements(pinnedAccounts, account),
  };
}

function getAllowedMovements(pinnedAccounts: string[], account: Account): PinnedMovement[] {
  const i = pinnedAccounts.indexOf(account.email);
  const movements: PinnedMovement[] = [];
  if (i > 0) {
    movements.push("up");
  }
  if (i < pinnedAccounts.length - 1) {
    movements.push("down");
  }
  return movements;
}

type PinnedMovement = "up" | "right" | "down" | "left";

export type PinMethods = {
  pin: (account: Account) => void;
  unpin: (account: Account) => void;
  unpinAll: () => void;
  moveUp: (account: Account) => void;
  moveDown: (account: Account) => void;
  getAllowedMovements: (account: Account) => PinnedMovement[];
};
