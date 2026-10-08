import { List, updateCommandMetadata, Icon, Color } from "@raycast/api";
import { oura } from "./utils/ouraData";
import { getDate } from "./utils/datetime";
import { minutesFormatted } from "./utils/measurement";
import { StressResponse } from "./types";
import Unauthorized from "./unauthorized";

export default function Command() {
  const stress = oura(`usercollection/daily_stress?start_date=${getDate(-14)}&end_date=${getDate()}`) as StressResponse;

  if (stress.isLoading) {
    return <List isLoading={stress.isLoading} />;
  }

  if (stress.error) {
    return <Unauthorized />;
  }

  if (!stress.data.data.length) {
    return (
      <List>
        <List.Item title={`Stress`} subtitle={`No stress data available. Open the Oura app to sync data.`} />
      </List>
    );
  }

  const sToday = stress?.data?.data[0];
  if (!stress.isLoading) {
    updateCommandMetadata({
      subtitle: `Stress: ${sToday.day_summary} | Stress High: ${minutesFormatted(sToday.stress_high / 60)} | Recovery High: ${minutesFormatted(sToday.recovery_high / 60)}`,
    });
  }

  const stressDays = [...stress.data.data].reverse();

  return (
    <List isLoading={stress.isLoading}>
      {stressDays.map((stress) => (
        <List.Item
          key={stress.day}
          title={`Stress: ${stress.day}`}
          subtitle={stress.day_summary}
          accessories={[
            { text: "Time in" },
            {
              text: { value: `Stress: ${minutesFormatted(stress.stress_high / 60)}`, color: Color.Red },
              icon: Icon.Heartbeat,
            },
            {
              text: { value: `Recovery: ${minutesFormatted(stress.recovery_high / 60)}`, color: Color.Green },
              icon: Icon.Heart,
            },
          ]}
        />
      ))}
    </List>
  );
}
