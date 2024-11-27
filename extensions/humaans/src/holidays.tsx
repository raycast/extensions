import { ActionPanel, List, Action, Icon } from "@raycast/api";
import { ENDPOINTS } from "./enums";
import { useHumaansApi } from "./hooks";
import { getFullName, getSuffix, getPerson } from "./utils";
import { Holiday } from "./types";

const formatDate = (date: string) => {
  const dateObj = new Date(date);

  const options = { weekday: "short", month: "short", day: "numeric" };
  const formattedDate = dateObj.toLocaleDateString("en-US", options as Intl.DateTimeFormatOptions);
  const suffix = getSuffix(dateObj.getDate());

  return `${formattedDate}${suffix}`;
};

export default function Command() {
  const { data: timeAway = [], isLoading: isTimeAwayLoading } = useHumaansApi(ENDPOINTS.TIME_AWAY, {
    isList: true,
    shouldShowToast: true,
  });
  const { data: people = [], isLoading: isPeopleLoading } = useHumaansApi(ENDPOINTS.PEOPLE, {
    isList: true,
    shouldShowToast: false,
  });

  const filteredTimeAway = timeAway
    ?.filter(({ startDate, endDate }: Holiday) => {
      const currentYear = new Date().getFullYear().toString();

      if (new Date(startDate) < new Date()) return false;

      return startDate.includes(currentYear) || endDate.includes(currentYear);
    })
    .filter(({ requestStatus }: Holiday) => requestStatus === "approved");

  const sortedTimeAway = filteredTimeAway.sort(
    (a: Holiday, b: Holiday) => (new Date(a.startDate) as any) - (new Date(b.startDate) as any)
  );

  return (
    <List isLoading={isPeopleLoading || isTimeAwayLoading}>
      {sortedTimeAway.length ? (
        sortedTimeAway.map(({ startDate, endDate, personId, id, days }: Holiday) => {
          const { firstName, lastName, preferredName, profilePhoto } = getPerson(people, personId);

          const fullName = getFullName(preferredName ?? firstName, lastName);

          return (
            <List.Item
              key={id}
              icon={profilePhoto?.variants["96"] || Icon.Person}
              title={fullName || "Unknown"}
              subtitle={formatDate(startDate) + " - " + formatDate(endDate)}
              accessories={[
                {
                  text: `${days} ${days === 1 ? "day" : "days"}`,
                  icon: Icon.Calendar,
                },
              ]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={`https://app.humaans.io/away?q=${encodeURIComponent(fullName)}`} />;
                </ActionPanel>
              }
            />
          );
        })
      ) : (
        <List.EmptyView icon={Icon.AirplaneTakeoff} title="No Holidays" />
      )}
    </List>
  );
}
