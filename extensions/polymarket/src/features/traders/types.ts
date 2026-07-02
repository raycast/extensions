/**
 * Represents a user's public profile returned by the Gamma API.
 */
export interface PublicProfile {
  createdAt?: string;
  proxyWallet: string; // The user's specific internal Polymarket wallet
  profileImage: string | null;
  displayUsernamePublic: boolean;
  bio: string | null;
  pseudonym: string; // The auto-generated or chosen display name
  name: string | null;
  xUsername?: string | null; // Associated X (Twitter) handle
  verifiedBadge: boolean;
}

/**
 * Represents a user's position on the global or category leaderboards.
 */
export interface LeaderboardEntry {
  rank: string; // The user's ranked position as a string
  proxyWallet: string;
  userName: string | null;
  vol: number; // Total trading volume
  pnl: number; // Profit and Loss metric for the timeframe
  profileImage: string | null;
  xUsername: string | null;
  verifiedBadge: boolean;
}

/**
 * Represents an currently open (active) trade position for a user.
 */
export interface Position {
  proxyWallet: string;
  asset: string;
  conditionId: string;
  size: number; // Number of shares held
  avgPrice: number; // Average purchase price of the shares
  initialValue: number; // Cost basis
  currentValue: number; // Present estimated value (USD)
  cashPnl: number; // Unrealized profit or loss in USD
  percentPnl: number; // Unrealized return percentage
  totalBought: number;
  realizedPnl: number;
  curPrice: number;
  redeemable: boolean;
  title: string; // Name of the market
  slug: string; // URL slug for the market
  outcome: string; // The specific outcome held (e.g. 'Yes', 'No', 'Trump')
  outcomeIndex?: number;
  endDate: string; // The market's resolution date
}

/**
 * Represents a completed trade or resolved position in the user's history.
 */
export interface ClosedPosition {
  proxyWallet: string;
  asset: string;
  conditionId: string;
  avgPrice: number;
  totalBought: number;
  realizedPnl: number; // Actual finalized profit or loss
  timestamp: number; // Unix timestamp formatting when the position was closed
  title: string;
  slug: string;
  outcome: string;
  outcomeIndex?: number;
  endDate: string;
}
