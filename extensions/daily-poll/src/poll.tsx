import { useState, useEffect } from "react";
import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Icon,
  Color,
} from "@raycast/api";
import { PollWithResults } from "./lib/supabase";
import { getUserHash } from "./lib/utils";
import { getTodayPoll, submitVote } from "./lib/poll-api";

export default function PollCommand() {
  const [poll, setPoll] = useState<PollWithResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [userHash, setUserHash] = useState<string | null>(null);

  useEffect(() => {
    async function initialize() {
      try {
        const hash = await getUserHash();
        setUserHash(hash);
        await loadTodayPoll(hash);
      } catch (error) {
        console.error("Error initializing:", error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Error initializing",
          message: error instanceof Error ? error.message : "Unknown error",
        });
        setLoading(false);
      }
    }
    initialize();
  }, []);

  async function loadTodayPoll(hash: string) {
    try {
      setLoading(true);
      const pollData = await getTodayPoll(hash);
      setPoll(pollData);
    } catch (error) {
      console.error("Error loading poll:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error loading poll",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleVote(optionIndex: number) {
    if (!userHash || !poll) return;

    try {
      const updatedCounts = await submitVote(
        poll.poll_date,
        optionIndex,
        userHash,
      );

      setPoll({
        ...poll,
        counts: updatedCounts,
        hasVoted: true,
        userVoteIndex: optionIndex,
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Vote recorded",
      });
    } catch (error) {
      console.error("Error voting:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error voting",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  if (loading) {
    return <List isLoading={true} />;
  }

  if (!poll) {
    return (
      <List filtering={false} searchBarPlaceholder="">
        <List.EmptyView
          icon={Icon.QuestionMark}
          title="No Poll Available"
          description="There's no poll for today. Check back tomorrow!"
        />
      </List>
    );
  }

  const totalVotes = poll.counts.reduce((sum, count) => sum + count, 0);
  const sortedOptions = poll.options
    .map((option, index) => ({
      option,
      index,
      count: poll.counts[index] || 0,
      percentage: totalVotes > 0 ? (poll.counts[index] || 0) / totalVotes : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // Results view (after voting)
  if (poll.hasVoted) {
    return (
      <List filtering={false} searchBarPlaceholder="">
        <List.Section title={poll.question}>
          {sortedOptions.map(({ option, index, count, percentage }) => {
            const percentageNum = (percentage * 100).toFixed(1);
            const isSelected = poll.userVoteIndex === index;
            const rank = sortedOptions.findIndex((o) => o.index === index) + 1;
            const rankColor =
              rank === 1
                ? Color.Orange
                : rank === 2
                  ? Color.SecondaryText
                  : rank === 3
                    ? Color.Blue
                    : Color.SecondaryText;

            return (
              <List.Item
                key={index}
                title={option}
                subtitle={`${percentageNum}% • ${count} ${count === 1 ? "vote" : "votes"}`}
                icon={
                  isSelected
                    ? { source: Icon.CheckCircle, tintColor: Color.Green }
                    : Icon.Circle
                }
                accessories={[
                  { tag: { value: `#${rank}`, color: rankColor } },
                  {
                    tag: {
                      value: `${percentageNum}%`,
                      color: Color.PrimaryText,
                    },
                  },
                  {
                    tag: {
                      value: `${count} ${count === 1 ? "vote" : "votes"}`,
                      color: Color.Blue,
                    },
                  },
                ]}
                actions={
                  <ActionPanel>
                    <Action
                      title="Refresh Results"
                      icon={Icon.ArrowClockwise}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                      onAction={() => userHash && loadTodayPoll(userHash)}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
        <List.Section>
          <List.Item
            title={`${totalVotes} total ${totalVotes === 1 ? "vote" : "votes"}`}
            accessories={[
              { text: "Resets daily at 12:00 AM EST", icon: Icon.Clock },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Refresh Results"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={() => userHash && loadTodayPoll(userHash)}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      </List>
    );
  }

  // Voting view (before voting)
  return (
    <List filtering={false} searchBarPlaceholder="">
      <List.Section title={poll.question}>
        {poll.options.map((option, index) => {
          return (
            <List.Item
              key={index}
              title={option}
              icon={Icon.Circle}
              actions={
                <ActionPanel>
                  <Action
                    title={`Vote for "${option}"`}
                    icon={Icon.Checkmark}
                    onAction={() => handleVote(index)}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
