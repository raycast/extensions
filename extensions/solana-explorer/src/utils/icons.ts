import { SolType } from "./explorerResolver";

export const getIconForType = (type: SolType) => {
  switch (type) {
    case SolType.TRANSACTION:
      return "📝";
    case SolType.ADDRESS:
      return "🔖";
    case SolType.BLOCK:
      return "📦";
    case SolType.TOKEN:
      return "💰";
  }
};
