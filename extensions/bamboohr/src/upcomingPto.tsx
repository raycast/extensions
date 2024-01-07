import { List, getPreferenceValues, Action, ActionPanel, Icon, Color, updateCommandMetadata } from "@raycast/api";
import { getTodayDate, getLastDateOfCurrentYear } from "./utils/date";
import { bamboo } from "./utils/bambooData";

const preferences = getPreferenceValues<Preferences>();

export default function Command() {
  interface TimeOffResponse {
    isLoading: boolean;
    data: {
      id: string;
      employeeId: string;
      status: {
        lastChanged: string;
        lastChangedByUserId: string;
        status: string;
      };
      name: string;
      start: string;
      end: string;
      created: string;
      type: {
        id: string;
        name: string;
        icon: string;
      };
      amount: {
        unit: string;
        amount: string;
      };
      actions: {
        view: boolean;
        edit: boolean;
        cancel: boolean;
        approve: boolean;
        deny: boolean;
        bypass: boolean;
      };
      dates: {
        [date: string]: string;
      };
      notes: {
        [key: string]: string;
      };
    }[];
  }

  const pto = bamboo(`time_off/requests/?start=${getTodayDate()}&end=${getLastDateOfCurrentYear()}`) as TimeOffResponse;

  updateCommandMetadata({ subtitle: `BambooHR` });

  const ptoIcon = (type: string): string => {
    switch (type) {
      case "Flexible PTO":
        return Icon.Sun;
      case "Sick Leave USA":
        return Icon.MedicalSupport;
      case "Unpaid Time Off":
        return Icon.BandAid;
      case "Jury Duty":
        return Icon.Hammer;
      case "Bereavement Global":
        return Icon.Heart;
      case "Maternity/Paternity":
        return Icon.Bird;
      case "Military Leave":
        return Icon.Shield;
      case "Company Holiday":
        return Icon.Gift;
      default:
        return Icon.Calendar;
    }
  };

  return (
    <List isLoading={pto.isLoading}>
      {pto.data?.map((item) => {
        const statusColor =
          item.status.status === "approved"
            ? Color.Green
            : item.status.status === "cancelled"
              ? Color.Blue
              : item.status.status === "denied"
                ? Color.Red
                : Color.Yellow;

        return (
          <List.Item
            key={item.id}
            title={item.name}
            subtitle={`${item.start} - ${item.end}`}
            icon={ptoIcon(item.type.name)}
            accessories={[
              {
                tag: { value: item.status.status, color: statusColor },
              },
            ]}
            actions={
              <ActionPanel title="PTO Actions">
                {item.actions.view && (
                  <Action.OpenInBrowser
                    icon={Icon.Book}
                    title={`View Request in BambooHR`}
                    url={`https://${preferences.bamboo_subdomain}.bamboohr.com/employees/pto/?id=${item.employeeId}`}
                  />
                )}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
