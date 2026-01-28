import { List, updateCommandMetadata, Icon, Color } from "@raycast/api";
import { oura } from "./utils/ouraData";
import { getDate } from "./utils/datetime";
import { ResilienceResponse } from "./types";
import Unauthorized from "./unauthorized";

export default function Command() {
  const resilience = oura(
    `usercollection/daily_resilience?start_date=${getDate(-14)}&end_date=${getDate()}`,
  ) as ResilienceResponse;

  if (resilience.isLoading) {
    return <List isLoading={resilience.isLoading} />;
  }

  if (resilience.error) {
    return <Unauthorized />;
  }

  if (!resilience.data.data.length) {
    return (
      <List>
        <List.Item title={`Resilience`} subtitle={`No resilience data available. Open the Oura app to sync data.`} />
      </List>
    );
  }

  const rToday = resilience?.data?.data[0];
  if (!resilience.isLoading) {
    updateCommandMetadata({
      subtitle: `Resilience: ${rToday.level} | Sleep: ${rToday.contributors.sleep_recovery} | Daytime: ${rToday.contributors.daytime_recovery} | Stress: ${rToday.contributors.stress}`,
    });
  }

  const resilienceDays = [...resilience.data.data].reverse();

  return (
    <List isLoading={resilience.isLoading}>
      {resilienceDays.map((resilience) => (
        <List.Item
          key={resilience.day}
          title={`Resilience: ${resilience.day}`}
          subtitle={resilience.level}
          accessories={[
            { text: { value: `Sleep: ${resilience.contributors.sleep_recovery}`, color: Color.Blue }, icon: Icon.Moon },
            {
              text: { value: `Daytime: ${resilience.contributors.daytime_recovery}`, color: Color.Green },
              icon: Icon.Sun,
            },
            { text: { value: `Stress: ${resilience.contributors.stress}`, color: Color.Yellow }, icon: Icon.Heartbeat },
          ]}
        />
      ))}
    </List>
  );
}
