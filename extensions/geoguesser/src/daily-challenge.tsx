import { Detail, ActionPanel, Action, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { getDailyChallenge, getMyDailyChallengeScore } from "./api/client";
import { DailyChallengeResponse, MyDailyChallengeScore } from "./types";
import { formatDateTime, formatNumber } from "./utils";

export default function DailyChallengeCommand() {
  const [challenge, setChallenge] = useState<DailyChallengeResponse | null>(null);
  const [myScore, setMyScore] = useState<MyDailyChallengeScore | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error] = useState<string | null>(null);

  useEffect(() => {
    async function fetchChallenge() {
      try {
        showToast({
          style: Toast.Style.Animated,
          title: "Loading daily challenge...",
        });

        const [challengeData, myScoreData] = await Promise.all([
          getDailyChallenge(),
          getMyDailyChallengeScore().catch(() => null),
        ]);
        setChallenge(challengeData);
        setMyScore(myScoreData);

        showToast({
          style: Toast.Style.Success,
          title: "Daily challenge loaded",
        });
      } catch (err) {
        console.error("Failed to fetch daily challenge:", err);
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load daily challenge",
          message: err instanceof Error ? err.message : "Please check your connection",
        });
      } finally {
        setIsLoading(false);
      }
    }
    fetchChallenge();
  }, []);

  if (error) {
    return <Detail markdown={`# ❌ Error\n\n${error}`} />;
  }

  if (!challenge || !challenge.token) {
    return <Detail markdown="# ❌ No daily challenge found" />;
  }

  const challengeUrl = `https://www.geoguessr.com/challenge/${challenge.token}`;

  const startDate = new Date(challenge.date);
  const expiresDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
  const timeRemainingMs = expiresDate.getTime() - Date.now();

  const hours = Math.floor(timeRemainingMs / (1000 * 60 * 60));
  const minutes = Math.floor((timeRemainingMs % (1000 * 60 * 60)) / (1000 * 60));

  const topPlayers = challenge.leaderboard.slice(0, 5);

  const markdown = `
# 📅 Daily Challenge

${
  myScore
    ? `
## 🎯 Your Score
- **Score:** ${formatNumber(myScore.totalScore)} pts
- **Time:** ${Math.floor(myScore.totalTime / 60)}m ${myScore.totalTime % 60}s
- **Distance:** ${formatNumber(Math.round(myScore.totalDistance / 1000))} km off
- **Streak:** 🔥 ${myScore.currentStreak}

${myScore.isOnLeaderboard ? "✅ **You're on the leaderboard!**" : "📊 Keep practicing to reach the leaderboard!"}

---
`
    : `
## ⚠️ Not Played Yet
You haven't played today's challenge yet!

---
`
}

**${formatNumber(challenge.participants)} participants** have played today

## ⏰ Time Remaining
**${hours}h ${minutes}m** until next challenge

## 🏆 Top 5 Players

${topPlayers
  .map(
    (player, idx) =>
      `${idx + 1}. **${player.nick}** ${player.countryCode.toUpperCase()} - ${formatNumber(player.totalScore)} pts`,
  )
  .join("\n")}

---

**Challenge by:** ${challenge.authorCreator.name}
  `;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          {myScore && (
            <>
              <Detail.Metadata.Label title="Your Score" text={`${formatNumber(myScore.totalScore)} pts`} icon="🎯" />
              <Detail.Metadata.Label
                title="Time"
                text={`${Math.floor(myScore.totalTime / 60)}m ${myScore.totalTime % 60}s`}
                icon="⏱️"
              />
              <Detail.Metadata.Label
                title="Distance"
                text={`${formatNumber(Math.round(myScore.totalDistance / 1000))} km`}
                icon="📏"
              />
              <Detail.Metadata.TagList title="Status">
                <Detail.Metadata.TagList.Item
                  text={myScore.isOnLeaderboard ? "On Leaderboard" : "Not on Leaderboard"}
                  color={myScore.isOnLeaderboard ? "#00FF00" : "#FF9500"}
                />
                <Detail.Metadata.TagList.Item text={`🔥 ${myScore.currentStreak} streak`} color="#FFD700" />
              </Detail.Metadata.TagList>

              <Detail.Metadata.Separator />
            </>
          )}

          <Detail.Metadata.Label title="Challenge Token" text={challenge.token} icon="🎲" />
          <Detail.Metadata.Label title="Time Remaining" text={`${hours}h ${minutes}m`} icon="⏰" />
          <Detail.Metadata.Label title="Participants" text={formatNumber(challenge.participants)} icon="👥" />

          <Detail.Metadata.Separator />

          <Detail.Metadata.Label title="Started" text={formatDateTime(startDate)} icon="🕐" />
          <Detail.Metadata.Label title="Expires" text={formatDateTime(expiresDate)} icon="⏱️" />

          <Detail.Metadata.Separator />

          <Detail.Metadata.Label
            title="Top Player"
            text={`${topPlayers[0]?.nick} - ${formatNumber(topPlayers[0]?.totalScore)} pts`}
            icon="🥇"
          />

          <Detail.Metadata.Separator />

          <Detail.Metadata.Link title="Play Challenge" target={challengeUrl} text="Open in Browser" />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Play Challenge" url={challengeUrl} />
          <Action.CopyToClipboard title="Copy Challenge Link" content={challengeUrl} />
          <Action.Push title="View Full Leaderboard" target={<LeaderboardView challenge={challenge} />} />
        </ActionPanel>
      }
    />
  );
}

function LeaderboardView({ challenge }: { challenge: DailyChallengeResponse }) {
  return (
    <List navigationTitle="Daily Challenge Leaderboard">
      {challenge.leaderboard.map((player, idx) => (
        <List.Item
          key={player.id}
          title={`${idx + 1}. ${player.nick}`}
          subtitle={`${formatNumber(player.totalScore)} pts`}
          accessories={[
            { text: `${Math.round(player.totalDistance)}m` },
            { text: player.countryCode.toUpperCase() },
            { text: `🔥${player.currentStreak}` },
          ]}
          icon={`https://flagcdn.com/48x36/${player.countryCode.toLowerCase()}.png`}
        />
      ))}
    </List>
  );
}
