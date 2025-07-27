/**
 * Truncates a long string (typically a pubkey or address) with ellipsis
 */
export function truncateKey(key: string | undefined, startLength = 8, endLength = 8): string {
  if (!key) return "";
  if (key.length <= startLength + endLength + 3) return key;
  return `${key.substring(0, startLength)}...${key.substring(key.length - endLength)}`;
}

/**
 * Formats an ISO timestamp to a localized datetime string
 */
export function formatTimestamp(timestamp: string | undefined): string {
  if (!timestamp) return "N/A";
  try {
    return new Date(timestamp).toLocaleString();
  } catch {
    return "Invalid Date";
  }
}

export function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export const getTypeLabel = (type: string): string => {
  switch (type) {
    case "spark_to_spark":
      return "Spark Transfer";
    case "spark_to_bitcoin":
      return "Bitcoin Withdrawal";
    case "bitcoin_to_spark":
      return "Bitcoin Deposit";
    case "spark_to_lightning":
      return "Lightning Payment";
    case "lightning_to_spark":
      return "Lightning Payment";
    case "unknown_transfer":
      return "Unknown Transfer";
    case "token_transfer":
      return "Token Transfer";
    case "token_multi_transfer":
      return "Token Transfer";
    case "token_mint":
      return "Token Mint";
    case "token_burn":
      return "Token Burn";
    case "token_announce":
      return "Token Announce";
    case "issuer_token_transfer":
      return "Issuer Token Transfer";
    case "token_freeze":
      return "Token Freeze";
    case "token_unfreeze":
      return "Token Unfreeze";
    case "issuer_token_burn":
      return "Issuer Token Burn";
    default:
      // Fallback for any unexpected types
      return capitalize(type.replace(/_/g, " "));
  }
};
