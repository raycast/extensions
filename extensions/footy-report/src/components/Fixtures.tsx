import {
  List,
  Icon,
  Color,
  Image,
  Action,
  ActionPanel,
  showToast,
  Toast,
  confirmAlert,
  getPreferenceValues,
} from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { Fixture, Location, Result } from "@src/types";
import { addHours, format } from "date-fns";

const Fixtures = ({
  fixtures,
  title,
  limit,
}: {
  fixtures?: Fixture[];
  title: string;
  limit?: number;
}) => {
  const limitedFixtures = fixtures?.slice(0, limit || fixtures?.length);
  const { calendarName } = getPreferenceValues<Preferences>();
  return (
    <List.Section title={title} subtitle={`${limitedFixtures?.length}`}>
      {limitedFixtures?.map((fixture) => {
        const fullTime = addHours(fixture.starting_at, 2);
        const formattedDate = format(fixture.starting_at, "eee, LLL d");
        const resultIcon =
          fixture.result === Result.Win
            ? { tintColor: Color.Green, source: Icon.CheckCircle }
            : fixture.result === Result.Draw
            ? { tintColor: Color.SecondaryText, source: Icon.MinusCircle }
            : fixture.result === Result.Loss
            ? { tintColor: Color.Red, source: Icon.XMarkCircle }
            : Icon.Calendar;
        const resultPrefix =
          typeof fixture.score?.host_goals === "number"
            ? `${fixture.score.host_goals} - ${fixture.score.away_goals} |`
            : "";
        const description = `${fixture.tvstations
          ?.map((tvStation) => `${tvStation.name}: ${tvStation.url}`)
          .join("\n")}`;
        return (
          <List.Item
            icon={resultIcon}
            title={`${resultPrefix} ${fixture.name}`}
            key={fixture.id}
            subtitle={`${fixture.venue}`}
            actions={
              resultIcon === Icon.Calendar && (
                <ActionPanel title="Fixture actions">
                  <Action
                    title="Save to Calender"
                    icon={Icon.Calendar}
                    onAction={async () => {
                      await confirmAlert({
                        title: "Save to Calendar",
                        message:
                          "You are about to save this fixture as an alert on the default Calendar app. Do you wish to continue?",
                        primaryAction: {
                          title: "Save",
                          onAction: async () => {
                            await runAppleScript(
                              `
                              var app = Application.currentApplication()
                              var Calendar = Application("${calendarName}")
                              Calendar.activate()
                              var calendars = Calendar.calendars.whose({name: "Calendar"})
                              var defaultCalendar = calendars[0]
                              var event = Calendar.Event({
                                summary: "${fixture.name}",
                                description: "${description}",
                                startDate: new Date(${fixture.starting_at.getTime()}), 
                                endDate: new Date(${fullTime.getTime()}),
                                location: "${fixture.venue}"
                              })
                              defaultCalendar.events.push(event)
                              event.show()
                            `,
                              { language: "JavaScript" },
                            );
                            await showToast({
                              style: Toast.Style.Success,
                              title: "Fixture saved to Calendar!",
                            });
                          },
                        },
                      });
                    }}
                  />
                </ActionPanel>
              )
            }
            accessories={[
              {
                tag: {
                  value: fixture.league.name,
                  color: Color.SecondaryText,
                },
                icon: {
                  mask: Image.Mask.Circle,
                  source: fixture.league.image_path,
                },
              },
              {
                tag: {
                  value: fixture.location === Location.Home ? "Home" : "Away",
                  color: Color.Orange,
                },
              },
              {
                text: {
                  value: formattedDate,
                  color: Color.SecondaryText,
                },
              },
            ]}
          />
        );
      })}
    </List.Section>
  );
};

export default Fixtures;
