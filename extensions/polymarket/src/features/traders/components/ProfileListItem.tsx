import { Action, ActionPanel, List, Icon, Color } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetchLeaderboard } from "../../../api/traders";
import { PublicProfile, LeaderboardEntry } from "../types";
import { ProfileDetail } from "./ProfileDetail";
import { formatAddress, formatCurrency } from "../../../utils/formatters";

export function ProfileListItem({ profile }: { profile: PublicProfile }) {
  const CATEGORIES = [
    { id: "OVERALL", icon: "🌍", tooltip: "Global Rank" },
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

  const { data: statsMap, isLoading } = useCachedPromise(
    async (address) => {
      // Execute leaderboard calls concurrently
      const results = await Promise.all(
        CATEGORIES.map(async (cat) => {
          try {
            const res = await fetchLeaderboard(address, cat.id, "ALL");
            return { id: cat.id, data: res && res.length > 0 ? res[0] : null };
          } catch (e) {
            return { id: cat.id, data: null };
          }
        }),
      );

      const map: Record<string, LeaderboardEntry | null> = {};
      results.forEach((r) => {
        map[r.id] = r.data;
      });
      return map;
    },
    [profile.proxyWallet],
  );

  const overall = statsMap?.["OVERALL"];
  const accessories: List.Item.Accessory[] = [];

  if (overall) {
    accessories.push({ text: `🌍 #${overall.rank}`, tooltip: "Global Rank" });
  }

  // Iterate over other categories to populate accessories
  CATEGORIES.filter((c) => c.id !== "OVERALL").forEach((cat) => {
    const stat = statsMap?.[cat.id];
    // Only show category ranks if the user is in the top 100
    if (stat && Number(stat.rank) <= 100) {
      accessories.push({ text: `${cat.icon} #${stat.rank}`, tooltip: cat.tooltip });
    }
  });

  const pnlStr = overall ? formatCurrency(overall.pnl) : "";
  const pnlColor = overall ? (overall.pnl >= 0 ? Color.Green : Color.Red) : Color.PrimaryText;

  if (overall) {
    accessories.unshift({ text: { value: pnlStr, color: pnlColor } });
  }

  // Prepend X badge at the very front (which renders on the left of PnL)
  if (profile.xUsername) {
    accessories.unshift({ text: "𝕏", tooltip: `X (Twitter) Verified: @${profile.xUsername}` });
  }

  return (
    <List.Item
      title={formatAddress(profile.name || profile.pseudonym || "Unknown Username")}
      subtitle={formatAddress(profile.proxyWallet)}
      icon={profile.profileImage || Icon.PersonCircle}
      accessories={isLoading ? [{ icon: Icon.CircleProgress }] : accessories}
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
