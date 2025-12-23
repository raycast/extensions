import { useState, useEffect } from "react";
import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Icon,
  Detail,
  getPreferenceValues,
  Color,
} from "@raycast/api";
import { supabase, Poll } from "./lib/supabase";

interface PollWithResults extends Poll {
  counts: number[];
}

export default function PreviousPollsCommand() {
  const [polls, setPolls] = useState<PollWithResults[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPoll, setSelectedPoll] = useState<PollWithResults | null>(
    null,
  );

  const preferences = getPreferenceValues<{ maxPolls?: string }>();
  const maxPolls = preferences.maxPolls
    ? parseInt(preferences.maxPolls, 10) || 50
    : 50;

  useEffect(() => {
    loadPreviousPolls();
  }, []);

  async function loadPreviousPolls() {
    try {
      setLoading(true);

      const { data: etDate, error: dateError } =
        await supabase.rpc("get_et_date");

      if (dateError) {
        throw new Error(`Failed to get ET date: ${dateError.message}`);
      }

      const todayEt = etDate as string;

      const { data: pollsData, error: pollsError } = await supabase
        .from("polls")
        .select("*")
        .lt("poll_date", todayEt)
        .order("poll_date", { ascending: false })
        .limit(maxPolls);

      if (pollsError) throw pollsError;

      const pollsWithResults = await Promise.all(
        (pollsData || []).map(async (poll) => {
          const options =
            typeof poll.options === "string"
              ? JSON.parse(poll.options)
              : poll.options;

          const { data: votes, error: votesError } = await supabase
            .from("votes")
            .select("option_index")
            .eq("poll_date", poll.poll_date);

          if (votesError) throw votesError;

          const counts = new Array(options.length).fill(0);
          if (votes) {
            for (const vote of votes) {
              if (
                vote.option_index >= 0 &&
                vote.option_index < options.length
              ) {
                counts[vote.option_index]++;
              }
            }
          }

          return {
            ...poll,
            options: options,
            counts: counts,
          };
        }),
      );

      setPolls(pollsWithResults);
    } catch (error) {
      console.error("Error loading previous polls:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error loading polls",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateString: string) {
    try {
      // Extract just the date part (YYYY-MM-DD) in case there's time info
      const dateOnly = dateString.split("T")[0].split(" ")[0];
      const [year, month, day] = dateOnly.split("-").map(Number);

      if (isNaN(year) || isNaN(month) || isNaN(day)) {
        return dateOnly; // Return date part if invalid
      }

      const date = new Date(Date.UTC(year, month - 1, day));

      if (isNaN(date.getTime())) {
        return dateOnly; // Return date part if invalid date
      }

      // Use toLocaleDateString with explicit options to ensure no time is included
      return date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
      });
    } catch (error) {
      // If error, try to return just the date part
      const dateOnly = dateString.split("T")[0].split(" ")[0];
      return dateOnly;
    }
  }

  function formatDateShort(dateString: string) {
    try {
      // Extract just the date part (YYYY-MM-DD) in case there's time info
      const dateOnly = dateString.split("T")[0].split(" ")[0];
      const [year, month, day] = dateOnly.split("-").map(Number);

      if (isNaN(year) || isNaN(month) || isNaN(day)) {
        return dateOnly; // Return date part if invalid
      }

      const date = new Date(Date.UTC(year, month - 1, day));

      if (isNaN(date.getTime())) {
        return dateOnly; // Return date part if invalid date
      }

      const today = new Date();
      const todayUTC = new Date(
        Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()),
      );
      const yesterdayUTC = new Date(todayUTC);
      yesterdayUTC.setUTCDate(yesterdayUTC.getUTCDate() - 1);

      // Compare date strings in YYYY-MM-DD format
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const yesterdayStr = `${yesterdayUTC.getUTCFullYear()}-${String(yesterdayUTC.getUTCMonth() + 1).padStart(2, "0")}-${String(yesterdayUTC.getUTCDate()).padStart(2, "0")}`;

      if (dateStr === yesterdayStr) {
        return "Yesterday";
      }

      const daysDiff = Math.floor(
        (todayUTC.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (daysDiff >= 0 && daysDiff < 7) {
        return `${daysDiff} day${daysDiff === 1 ? "" : "s"} ago`;
      }

      // Format date without any time component
      const formatted = date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year:
          date.getUTCFullYear() !== todayUTC.getUTCFullYear()
            ? "numeric"
            : undefined,
        timeZone: "UTC",
      });

      // Ensure no time is included (double check)
      return formatted.split(",")[0].trim();
    } catch (error) {
      // If error, try to return just the date part
      const dateOnly = dateString.split("T")[0].split(" ")[0];
      return dateOnly;
    }
  }

  // Helper to create a visual progress bar
  function createProgressBar(percentage: number, width: number = 30): string {
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;
    return "█".repeat(filled) + "░".repeat(empty);
  }

  if (selectedPoll) {
    const totalVotes = selectedPoll.counts.reduce(
      (sum, count) => sum + count,
      0,
    );
    const sortedOptions = selectedPoll.options
      .map((option, index) => ({
        option,
        index,
        count: selectedPoll.counts[index] || 0,
        percentage:
          totalVotes > 0 ? (selectedPoll.counts[index] || 0) / totalVotes : 0,
      }))
      .sort((a, b) => b.count - a.count);

    const markdown = `# ${selectedPoll.question}

**${formatDate(selectedPoll.poll_date)}**

---

## Results

${sortedOptions
  .map(({ option, count, percentage }, rank) => {
    const percentageNum = (percentage * 100).toFixed(1);
    const progressBar = createProgressBar(parseFloat(percentageNum));
    const rankEmoji =
      rank === 0 ? "🥇" : rank === 1 ? "🥈" : rank === 2 ? "🥉" : "";

    return `### ${rankEmoji} ${rank + 1}. ${option}

\`\`\`
${progressBar} ${percentageNum}%
\`\`\`

**${count}** ${count === 1 ? "vote" : "votes"} • **${percentageNum}%**`;
  })
  .join("\n\n---\n\n")}

---

**Total Votes:** ${totalVotes} ${totalVotes === 1 ? "person" : "people"}
`;

    return (
      <Detail
        markdown={markdown}
        actions={
          <ActionPanel>
            <Action
              title="Back to List"
              icon={Icon.ArrowLeft}
              shortcut={{ modifiers: ["cmd"], key: "b" }}
              onAction={() => setSelectedPoll(null)}
            />
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={async () => {
                await loadPreviousPolls();
                // Reload the selected poll if it still exists
                const updatedPoll = polls.find(
                  (p) => p.poll_date === selectedPoll.poll_date,
                );
                if (updatedPoll) {
                  setSelectedPoll(updatedPoll);
                }
              }}
            />
          </ActionPanel>
        }
      />
    );
  }

  if (loading) {
    return <List isLoading={true} />;
  }

  if (polls.length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Clock}
          title="No Previous Polls"
          description="There are no previous polls to display."
        />
      </List>
    );
  }

  return (
    <List>
      <List.Section title="Previous Polls">
        {polls.map((poll) => {
          const totalVotes = poll.counts.reduce((sum, count) => sum + count, 0);
          const topIndex = poll.counts.indexOf(Math.max(...poll.counts));
          const topOption = topIndex >= 0 ? poll.options[topIndex] : "N/A";

          return (
            <List.Item
              key={poll.poll_date}
              title={poll.question}
              subtitle={formatDateShort(poll.poll_date)}
              icon={Icon.QuestionMark}
              accessories={[
                {
                  tag: {
                    value: formatDateShort(poll.poll_date),
                    color: Color.SecondaryText,
                  },
                  icon: Icon.Calendar,
                },
                {
                  tag: {
                    value: `${totalVotes} ${totalVotes === 1 ? "vote" : "votes"}`,
                    color: Color.Blue,
                  },
                  icon: Icon.Person,
                },
                {
                  tag: { value: topOption, color: Color.Orange },
                  icon: Icon.Trophy,
                },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="View Results"
                    icon={Icon.Eye}
                    onAction={() => setSelectedPoll(poll)}
                  />
                  <Action
                    title="Refresh List"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={loadPreviousPolls}
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
