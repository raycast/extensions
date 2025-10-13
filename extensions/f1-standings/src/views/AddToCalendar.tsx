import { Action, ActionPanel, Form, Icon, LocalStorage, showHUD, useNavigation } from "@raycast/api";
import moment from "moment";
import { useEffect, useState } from "react";
import { runAppleScript } from "run-applescript";
import { Race } from "../types";
import { getFlag } from "../utils";

class Calendar {
  name: string;

  constructor(name: string) {
    this.name = name;
  }
}

export function AddToCalendar({ race, raceDates }: { race: Race; raceDates: [string, Date][] }) {
  const { pop } = useNavigation();
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastCalendar, setLastCalendar] = useState<Calendar>();

  useEffect(() => {
    async function fetchCalendars() {
      const lastCalendarName = await LocalStorage.getItem<string>("f1:calendar");
      if (lastCalendarName) {
        setLastCalendar(new Calendar(lastCalendarName));
      }
      setIsLoading(true);
      const result = await runAppleScript(
        'set output to ""\n' +
          'tell application "Calendar"\n' +
          "set output to name of calendars where writable is true\n" +
          "end tell\n" +
          "return output",
      );
      const lines = result.split(",");
      const calendars = lines.map((value) => new Calendar(value.trim()));
      setCalendars(calendars);
      setIsLoading(false);
    }

    fetchCalendars();
  }, []);

  async function addEventsToCalendar(calendar: string) {
    LocalStorage.setItem("f1:calendar", calendar);
    await runAppleScript(
      'tell application "Calendar"\n' +
        `tell calendar "${calendar}"\n` +
        raceDates
          .map((date) => {
            const endDate = moment(date[1]).add(2, "hours");
            return `make new event with properties { summary:"🏎 ${getFlag(race.Circuit.Location.country)} ${
              date[0]
            } - ${race.raceName}", start date:(date "${moment(date[1]).format(
              "DD-MM-YYYY HH:mm",
            )}"), end date:(date "${endDate.format("DD-MM-YYYY HH:mm")}")}`;
          })
          .join("\n") +
        "\nend tell\n" +
        "end tell\n",
    );
    pop();
    showHUD("All events have been added to your calendar. 🏎️💨");
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Add to calendar"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add All Events to Calendar"
            icon={Icon.Calendar}
            onSubmit={({ calendar }) => addEventsToCalendar(calendar)}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="calendar" title="Calendar" defaultValue={lastCalendar?.name}>
        {calendars.map((item, index) => (
          <Form.Dropdown.Item value={item.name} title={item.name} key={index} icon={Icon.Calendar} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
