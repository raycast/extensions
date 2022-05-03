import { subDays } from "date-fns";
import { useEffect, useState } from "react";
import { Action, ActionPanel, Icon, Image, List } from "@raycast/api";

import { useUser } from "./hooks";
import { RangeStatsList } from "./components";
import { getDuration, getSummary } from "./utils";

export default function Command() {
  const { data, isLoading } = useUser();
  const [showDetail, setShowDetail] = useState(false);
  const [stats, setStats] = useState({ emoji: "", percent: 0, duration: "" });

  useEffect(() => {
    async function getData() {
      const { data } = await getSummary("Last 1 Day", subDays(new Date(), 1));
      const days = Object.fromEntries(data.map((day) => [day.range.text.toLowerCase(), day.grand_total.total_seconds]));

      const timeDiff = Math.abs(days.today - days.yesterday);
      const [quantifier, emoji] = days.today <= days.yesterday ? ["less", "⬇️"] : ["more", "⬆️"];

      setStats({
        emoji,
        percent: Math.floor((timeDiff / days.yesterday) * 1e2),
        duration: `You've spent ${getDuration(timeDiff)} ${quantifier} compared to yesterday`,
      });
    }

    getData();
  }, []);

  return (
    <List isLoading={isLoading} isShowingDetail={showDetail}>
      {data !== undefined && (
        <List.Section title="Profile">
          <List.Item
            subtitle={data.username}
            title={data.display_name}
            accessories={[{ icon: Icon.Envelope, tooltip: data.public_email }]}
            icon={data.photo_public ? { source: data.photo, mask: Image.Mask.Circle } : Icon.Person}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={data.profile_url} title="Open in Browser" />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      {!!stats.duration && (
        <List.Item title={stats.duration} accessories={[{ text: `${stats.percent}%   ${stats.emoji}` }]} />
      )}
      <RangeStatsList {...{ showDetail, setShowDetail }} />
    </List>
  );
}
