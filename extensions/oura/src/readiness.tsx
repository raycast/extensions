import { List, updateCommandMetadata } from "@raycast/api";
import { oura } from "./utils/ouraData";
import { getDate } from "./utils/datetime";
import { ReadinessResponse } from "./types";
import { getProgressStatus } from "./utils/measurement";
import Unauthorized from "./unauthorized";

const loading = `Loading...`;

export default function Command() {
  const readiness = oura(
    `usercollection/daily_readiness?start_date=${getDate()}&end_date=${getDate()}`,
  ) as ReadinessResponse;

  if (readiness.isLoading) {
    return (
      <List isLoading={readiness.isLoading}>
        <List.Item title={`Readiness Score`} subtitle={loading} />
        <List.Item title={`Temperature Deviation`} subtitle={loading} />
        <List.Item title={`Temperature Trend Deviation`} subtitle={loading} />
        <List.Item title={`Readiness Contributors (% of how it impacts today's Readiness Score):`} />
        <List.Item title={`└— Recovery Index`} subtitle={loading} />
        <List.Item title={`└— Activity Balance`} subtitle={loading} />
        <List.Item title={`└— Sleep Balance`} subtitle={loading} />
        <List.Item title={`└— HRV Balance:`} subtitle={loading} />
        <List.Item title={`└— Resting Heart Rate:`} subtitle={loading} />
        <List.Item title={`└— Previous Day Activity:`} subtitle={loading} />
        <List.Item title={`└— Previous Night:`} subtitle={loading} />
      </List>
    );
  }

  if (readiness.error) {
    return <Unauthorized />;
  }

  if (!readiness.data.data.length) {
    return (
      <List>
        <List.Item
          title={`Readiness Score`}
          subtitle={`No readiness data available. Open the Oura app to sync data.`}
        />
      </List>
    );
  }

  const rToday = readiness?.data.data[0];
  if (!readiness.isLoading) {
    updateCommandMetadata({
      subtitle: `Readiness: ${rToday.score}`,
    });
  }
  return (
    <List isLoading={readiness.isLoading}>
      <List.Item title={`Readiness Score`} icon={getProgressStatus(rToday.score)} subtitle={`${rToday.score}`} />
      <List.Item title={`Temperature Deviation`} subtitle={`${rToday.temperature_deviation}°C`} />
      <List.Item title={`Temperature Trend Deviation`} subtitle={`${rToday.temperature_trend_deviation}°C`} />
      <List.Item title={`Readiness Contributors (% of how it impacts today's Readiness Score):`} />
      <List.Item
        title={`└— Recovery Index`}
        icon={getProgressStatus(parseInt(rToday.contributors.recovery_index))}
        subtitle={`${rToday.contributors.recovery_index}%`}
      />
      <List.Item
        title={`└— Activity Balance`}
        icon={getProgressStatus(parseInt(rToday.contributors.activity_balance))}
        subtitle={`${rToday.contributors.activity_balance}%`}
      />
      <List.Item
        title={`└— Sleep Balance`}
        icon={getProgressStatus(parseInt(rToday.contributors.sleep_balance))}
        subtitle={`${rToday.contributors.sleep_balance}%`}
      />
      <List.Item
        title={`└— HRV Balance:`}
        icon={getProgressStatus(parseInt(rToday.contributors.hrv_balance))}
        subtitle={`${rToday.contributors.hrv_balance}%`}
      />
      <List.Item
        title={`└— Resting Heart Rate:`}
        icon={getProgressStatus(parseInt(rToday.contributors.resting_heart_rate))}
        subtitle={`${rToday.contributors.resting_heart_rate}%`}
      />
      <List.Item
        title={`└— Previous Day Activity:`}
        icon={getProgressStatus(parseInt(rToday.contributors.previous_day_activity))}
        subtitle={`${rToday.contributors.previous_day_activity}%`}
      />
      <List.Item
        title={`└— Previous Night:`}
        icon={getProgressStatus(parseInt(rToday.contributors.activity_balance))}
        subtitle={`${rToday.contributors.activity_balance}%`}
      />
    </List>
  );
}
