import { List, updateCommandMetadata } from "@raycast/api";
import { oura } from "./utils/ouraData";
import { getDate } from "./utils/datetime";
import { SleepResponse } from "./types";
import { getProgressStatus } from "./utils/measurement";
import Unauthorized from "./unauthorized";

export default function Command() {
  const sleep = oura(`usercollection/daily_sleep?start_date=${getDate()}&end_date=${getDate()}`) as SleepResponse;

  if (sleep.isLoading) {
    return (
      <List isLoading={sleep.isLoading}>
        <List.Item title={`Sleep Score`} subtitle={`Loading...`} />
        <List.Item title={`Sleep Contributors (% of how it impacts your Sleep Score):`} />
        <List.Item title={`└— Total Sleep`} subtitle={`Loading...`} />
        <List.Item title={`└— Efficiency`} subtitle={`Loading...`} />
        <List.Item title={`└— Timing`} subtitle={`Loading...`} />
        <List.Item title={`└— Latency:`} subtitle={`Loading...`} />
        <List.Item title={`└— Restfulness:`} subtitle={`Loading...`} />
        <List.Item title={`└— Deep Sleep:`} subtitle={`Loading...`} />
        <List.Item title={`└— REM Sleep:`} subtitle={`Loading...  `} />
      </List>
    );
  }

  if (sleep.error) {
    return <Unauthorized />;
  }

  if (!sleep.data.data.length) {
    return (
      <List>
        <List.Item title={`Sleep Score`} subtitle={`No sleep data available. Open the Oura app to sync data.`} />
      </List>
    );
  }

  const sToday = sleep?.data.data[0];
  if (!sleep.isLoading) {
    updateCommandMetadata({
      subtitle: `Sleep: ${sToday.score}`,
    });
  }

  return (
    <List isLoading={sleep.isLoading}>
      <List.Item title={`Sleep Score`} icon={getProgressStatus(sToday.score)} subtitle={`${sToday.score}`} />
      <List.Item title={`Sleep Contributors (% of how it impacts your Sleep Score):`} />
      <List.Item
        title={`└— Total Sleep`}
        icon={getProgressStatus(sToday.contributors.total_sleep)}
        subtitle={`${sToday.contributors.total_sleep}%`}
      />
      <List.Item
        title={`└— Efficiency`}
        icon={getProgressStatus(sToday.contributors.efficiency)}
        subtitle={`${sToday.contributors.efficiency}%`}
      />
      <List.Item
        title={`└— Timing`}
        icon={getProgressStatus(sToday.contributors.timing)}
        subtitle={`${sToday.contributors.timing}%`}
      />
      <List.Item
        title={`└— Latency:`}
        icon={getProgressStatus(sToday.contributors.latency)}
        subtitle={`${sToday.contributors.latency}%`}
      />
      <List.Item
        title={`└— Restfulness:`}
        icon={getProgressStatus(sToday.contributors.restfulness)}
        subtitle={`${sToday.contributors.restfulness}%`}
      />
      <List.Item
        title={`└— Deep Sleep:`}
        icon={getProgressStatus(sToday.contributors.deep_sleep)}
        subtitle={`${sToday.contributors.deep_sleep}%`}
      />
      <List.Item
        title={`└— REM Sleep:`}
        icon={getProgressStatus(sToday.contributors.rem_sleep)}
        subtitle={`${sToday.contributors.rem_sleep}%`}
      />
    </List>
  );
}
