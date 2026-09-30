import { List, Detail, updateCommandMetadata, getPreferenceValues, Action, ActionPanel, Icon } from "@raycast/api";
import { getDaysLeftInYear } from "./utils/date";
import { bamboo } from "./utils/bambooData";

const preferences = getPreferenceValues<Preferences>();

export default function Command() {
  interface TimeOffResponse {
    isLoading: boolean;
    data: {
      timeOffType: string;
      name: string;
      units: string;
      balance: string;
      end: string;
      policyType: string;
      usedYearToDate: string;
    }[];
  }

  if (!preferences.bamboo_user_id) {
    return (
      <Detail
        markdown={`## Command unavailable \nThis command only works if you have the \`bamboo user id\` filled out in this extensions settings. You can find your ID at ${preferences.bamboo_subdomain}.bamboohr.com.`}
      />
    );
  }

  const pto = bamboo(`employees/${preferences.bamboo_user_id}/time_off/calculator`) as TimeOffResponse;

  const usedHoursToDaysBalance = (usedHours: string) => {
    return (parseInt(usedHours) / 8).toFixed(2) + " days";
  };

  if (pto.data) {
    const ptoDay = getDaysLeftInYear() === 1 ? "day" : "days";
    updateCommandMetadata({
      subtitle: `${getDaysLeftInYear()} ${ptoDay} left in this calendar year. ${usedHoursToDaysBalance(
        pto.data[0].usedYearToDate,
      )} used so far`,
    });
  }

  return (
    <List isLoading={pto.isLoading}>
      {pto.data?.map((item) => (
        <List.Item
          key={item.timeOffType}
          title={item.name}
          subtitle={`Balance: ${item.balance} ${item.units} | Used: ${item.usedYearToDate} ${
            item.units
          } / ${usedHoursToDaysBalance(item.usedYearToDate)}`}
          actions={
            <ActionPanel title="PTO Actions">
              <Action.OpenInBrowser
                icon={Icon.Book}
                title={`Request ${item.name}`}
                url={`https://${preferences.bamboo_subdomain}.bamboohr.com/app/time_off/requests/create`}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
