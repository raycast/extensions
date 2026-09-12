import { Action, ActionPanel, List, Icon, Color, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { fetchLeaderboard } from "../../../api/traders";
import { PublicProfile, LeaderboardEntry } from "../types";
import { ProfileDetail } from "./ProfileDetail";
import { formatAddress, formatCurrency } from "../../../utils/formatters";

const CATEGORIES = [
  { id: "POLITICS", icon: "🗳️", tooltip: "Politics Rank" },
  { id: "CRYPTO", icon: "⛓️", tooltip: "Crypto Rank" },
  { id: "SPORTS", icon: "🏀", tooltip: "Sports Rank" },
  { id: "FINANCE", icon: "💵", tooltip: "Finance Rank" },
  { id: "CULTURE", icon: "🎭", tooltip: "Culture Rank" },
  { id: "MENTIONS", icon: "🗣️", tooltip: "Mentions Rank" },
  { id: "WEATHER", icon: "🌤️", tooltip: "Weather Rank" },
  { id: "ECONOMICS", icon: "📊", tooltip: "Economics Rank" },
  { id: "TECH", icon: "💻", tooltip: "Tech Rank" },
];

// Simple delay helper for spacing out API calls to respect rate limits
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function ProfileListItem({ profile }: { profile: PublicProfile }) {
  // 1. Eagerly load the OVERALL rank using useCachedPromise
  const { data: overallStats, isLoading: overallLoading } = useCachedPromise(
    async (address) => {
      try {
        const res = await fetchLeaderboard(address, "OVERALL", "ALL");
        return res && res.length > 0 ? res[0] : null;
      } catch (e) {
        return null;
      }
    },
    [profile.proxyWallet],
  );

  // 2. State for the remaining secondary categories
  const [secondaryStats, setSecondaryStats] = useState<Record<string, LeaderboardEntry | null>>({});
  const [isSecondaryLoading, setIsSecondaryLoading] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);

  // 3. Incrementally fetch secondary categories
  useEffect(() => {
    let isMounted = true;

    async function fetchSecondaryCategories() {
      if (!profile.proxyWallet || rateLimited) return;
      setIsSecondaryLoading(true);

      const statsBuffer: Record<string, LeaderboardEntry | null> = {};

      for (const cat of CATEGORIES) {
        if (!isMounted || rateLimited) break;

        try {
          // Delay to prevent hammering the API (Rate limit: 1000 per 10s)
          await delay(250);
          const res = await fetchLeaderboard(profile.proxyWallet, cat.id, "ALL");
          const stat = res && res.length > 0 ? res[0] : null;

          if (isMounted) {
            statsBuffer[cat.id] = stat;
          }
        } catch (error) {
          const e = error as Error;
          // If we hit a rate limit, stop fetching for this component
          if (e.message?.includes("rate limit") || e.message?.includes("429")) {
            if (isMounted) {
              setRateLimited(true);
              // Only toast once to avoid spamming the user
              showToast({
                style: Toast.Style.Failure,
                title: "Rate Limit Reached",
                message: "Some ranks couldn't be loaded.",
              });
            }
            break;
          } else {
            // Treat other errors as null and continue
            if (isMounted) {
              statsBuffer[cat.id] = null;
            }
          }
        }
      }

      if (isMounted) {
        if (Object.keys(statsBuffer).length > 0) {
          setSecondaryStats((prev) => ({ ...prev, ...statsBuffer }));
        }
        setIsSecondaryLoading(false);
      }
    }

    // Only start fetching secondary stats if overall has finished (to spread load further)
    if (!overallLoading && overallStats !== undefined) {
      fetchSecondaryCategories();
    }

    return () => {
      isMounted = false;
    };
  }, [profile.proxyWallet, overallLoading, overallStats, rateLimited]);

  const accessories: List.Item.Accessory[] = [];

  // PnL & Overall Rank
  const pnlStr = overallStats ? formatCurrency(overallStats.pnl) : "";
  const pnlColor = overallStats ? (overallStats.pnl >= 0 ? Color.Green : Color.Red) : Color.PrimaryText;

  if (overallStats) {
    accessories.push({ text: { value: pnlStr, color: pnlColor } });
    accessories.push({ text: `🌍 #${overallStats.rank}`, tooltip: "Global Rank" });
  }

  // Iterate over resolved secondary categories to populate accessories
  CATEGORIES.forEach((cat) => {
    const stat = secondaryStats[cat.id];
    // Only show category ranks if the user is in the top 100
    if (stat && Number(stat.rank) <= 100) {
      accessories.push({ text: `${cat.icon} #${stat.rank}`, tooltip: cat.tooltip });
    }
  });

  // Adding loading indicator for secondary stats or rate limit warning
  if (isSecondaryLoading) {
    accessories.push({ icon: Icon.CircleProgress, tooltip: "Loading category ranks..." });
  } else if (rateLimited) {
    accessories.push({ icon: { source: Icon.Warning, tintColor: Color.Yellow }, tooltip: "Rate limited" });
  }

  // Prepend X badge at the very front
  if (profile.xUsername) {
    accessories.unshift({ text: "𝕏", tooltip: `X (Twitter) Verified: @${profile.xUsername}` });
  }

  return (
    <List.Item
      title={formatAddress(profile.name || profile.pseudonym || "Unknown Username")}
      subtitle={formatAddress(profile.proxyWallet)}
      icon={profile.profileImage || Icon.PersonCircle}
      accessories={overallLoading ? [{ icon: Icon.CircleProgress }] : accessories}
      actions={
        <ActionPanel>
          <Action.Push
            title="View Details"
            icon={Icon.Sidebar}
            target={<ProfileDetail address={profile.proxyWallet} profile={profile} />}
          />
          <Action.CopyToClipboard title="Copy Wallet Address" content={profile.proxyWallet} />
          {profile.xUsername && (
            <Action.OpenInBrowser title="Open X Profile" url={`https://x.com/${profile.xUsername}`} />
          )}
        </ActionPanel>
      }
    />
  );
}
