import { Detail, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { getProfile, getProfileStats } from "./api/client";
import { ProfileResponse, StatsResponse } from "./types";
import { formatDate, formatNumber } from "./utils";

export default function ViewProfile() {
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        showToast({
          style: Toast.Style.Animated,
          title: "Loading profile...",
        });

        const [profileData, statsData] = await Promise.all([getProfile(), getProfileStats()]);
        setProfile(profileData);
        setStats(statsData);

        showToast({
          style: Toast.Style.Success,
          title: "Profile loaded",
        });
      } catch (error) {
        console.error("Failed to fetch profile:", error);
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load profile",
          message: error instanceof Error ? error.message : "Please check your authentication token",
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  const xpProgress = profile?.user?.progress
    ? Math.round(
        ((profile.user.progress.xp - profile.user.progress.levelXp) /
          (profile.user.progress.nextLevelXp - profile.user.progress.levelXp)) *
          100,
      )
    : 0;

  const progressBar = "█".repeat(Math.floor(xpProgress / 5)) + "░".repeat(20 - Math.floor(xpProgress / 5));

  const markdown = `
# ${profile?.user?.nick || "Loading..."}

${profile?.user?.isVerified ? "✅ Verified" : ""} ${profile?.user?.isProUser ? "⭐ **Pro**" : ""} ${profile?.user?.type ? `**${profile.user.type}**` : ""}

---

## Level Progress
**Level ${profile?.user?.progress?.level || "—"}** ${progressBar} **${xpProgress}%**

\`${formatNumber(profile?.user?.progress?.xp || 0)} / ${formatNumber(profile?.user?.progress?.nextLevelXp || 0)} XP\`
`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          {/* Profile Section */}
          <Detail.Metadata.Label
            title="Country"
            text={profile?.user?.countryCode?.toUpperCase() || "—"}
            icon={`https://flagcdn.com/48x36/${profile?.user?.countryCode?.toLowerCase() || "de"}.png`}
          />
          <Detail.Metadata.Label
            title="Member Since"
            text={profile?.user?.created ? formatDate(new Date(profile.user.created)) : "—"}
          />

          <Detail.Metadata.Separator />

          {/* Game Stats */}
          <Detail.Metadata.Label title="Games Played" text={`${stats?.gamesPlayed || "—"}`} icon="🎮" />
          <Detail.Metadata.Label
            title="Daily Challenges"
            text={`${profile?.user?.dailyChallengeProgress || 0}`}
            icon="📅"
          />

          <Detail.Metadata.Separator />

          {/* Streak Progress */}
          <Detail.Metadata.Label title="🔥 Streak Progress" />
          <Detail.Metadata.TagList title="">
            <Detail.Metadata.TagList.Item text={`🥉 ${profile?.user?.streakProgress?.bronze || 0}`} color="#CD7F32" />
            <Detail.Metadata.TagList.Item text={`🥈 ${profile?.user?.streakProgress?.silver || 0}`} color="#C0C0C0" />
            <Detail.Metadata.TagList.Item text={`🥇 ${profile?.user?.streakProgress?.gold || 0}`} color="#FFD700" />
            <Detail.Metadata.TagList.Item text={`💎 ${profile?.user?.streakProgress?.platinum || 0}`} color="#00CED1" />
          </Detail.Metadata.TagList>

          <Detail.Metadata.Separator />

          {/* Battle Royale */}
          <Detail.Metadata.TagList title="Battle Royale">
            <Detail.Metadata.TagList.Item text={`Level ${profile?.user?.br?.level || "—"}`} color="#FFD700" />
            <Detail.Metadata.TagList.Item text={`Division ${profile?.user?.br?.division || "—"}`} color="#C0C0C0" />
            <Detail.Metadata.TagList.Item text={`Rating: ${profile?.user?.competitive?.rating || 0}`} color="#CD7F32" />
          </Detail.Metadata.TagList>

          <Detail.Metadata.Separator />

          {/* Explorer Progress */}
          <Detail.Metadata.Label title="🌍 Explorer Progress" />
          <Detail.Metadata.TagList title="">
            <Detail.Metadata.TagList.Item text={`🥉 ${profile?.user?.explorerProgress?.bronze || 0}`} color="#CD7F32" />
            <Detail.Metadata.TagList.Item text={`🥈 ${profile?.user?.explorerProgress?.silver || 0}`} color="#C0C0C0" />
            <Detail.Metadata.TagList.Item text={`🥇 ${profile?.user?.explorerProgress?.gold || 0}`} color="#FFD700" />
            <Detail.Metadata.TagList.Item
              text={`💎 ${profile?.user?.explorerProgress?.platinum || 0}`}
              color="#00CED1"
            />
          </Detail.Metadata.TagList>

          <Detail.Metadata.Separator />

          <Detail.Metadata.Link
            title="View Full Profile"
            target={`https://www.geoguessr.com${profile?.user?.url || ""}`}
            text="Open in Browser"
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={`https://www.geoguessr.com${profile?.user?.url || "/me/profile"}`} />
          <Action.CopyToClipboard
            title="Copy Profile URL"
            content={`https://www.geoguessr.com${profile?.user?.url || ""}`}
          />
        </ActionPanel>
      }
    />
  );
}
