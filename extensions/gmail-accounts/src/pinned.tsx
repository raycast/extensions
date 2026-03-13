import { useCachedState } from "@raycast/utils";
import type { Account } from "./gmail";

export function usePinnedAccounts() {
  const [pinnedAccounts, setPinnedAccounts] = useCachedState<string[]>("pinned", []);

  return {
    pinnedAccounts,
    pin: (account: Account) => setPinnedAccounts((prev) => [...prev, account.key]),
    unpin: (account: Account) => setPinnedAccounts((prev) => prev.filter((key) => key !== account.key)),
    moveUp: (account: Account) =>
      setPinnedAccounts((prev) => {
        const i = prev.indexOf(account.key);
        if (i === -1 || i === 0) return prev;

        const newArray = [...prev];
        [newArray[i - 1], newArray[i]] = [newArray[i], newArray[i - 1]];
        return newArray;
      }),
    moveDown: (account: Account) =>
      setPinnedAccounts((prev) => {
        const i = prev.indexOf(account.key);
        if (i === -1 || i === prev.length - 1) return prev;

        const newArray = [...prev];
        [newArray[i], newArray[i + 1]] = [newArray[i + 1], newArray[i]];
        return newArray;
      }),
    getAllowedMovements: (account: Account) => getAllowedMovements(pinnedAccounts, account),
  };
}

function getAllowedMovements(pinnedAccounts: string[], account: Account): PinnedMovement[] {
  const i = pinnedAccounts.indexOf(account.key);
  const movements: PinnedMovement[] = [];
  if (i > 0) {
    movements.push("up");
  }
  if (i < pinnedAccounts.length - 1) {
    movements.push("down");
  }
  return movements;
}

type PinnedMovement = "up" | "down";

export type PinMethods = {
  pin: (account: Account) => void;
  unpin: (account: Account) => void;
  moveUp: (account: Account) => void;
  moveDown: (account: Account) => void;
  getAllowedMovements: (account: Account) => PinnedMovement[];
};
