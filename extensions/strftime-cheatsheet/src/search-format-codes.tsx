import { ActionPanel, Action, Icon, List, Color, getPreferenceValues } from "@raycast/api";

type Code = {
  directive: string;
  description: string;
  example: string;
};

const strftimeCodes: { [key: string]: Code[] } = {
  Time: [
    { directive: "%H", description: "Hour in 24h format (00-23)", example: "00, 01, ..., 23" },
    { directive: "%I", description: "Hour in 12h format (01-12)", example: "01, 02, ..., 12" },
    { directive: "%M", description: "Minute (00-59)", example: "00, 01, ..., 59" },
    { directive: "%S", description: "Second (00-61)", example: "00, 01, ..., 59" },
    { directive: "%p", description: "AM or PM designation", example: "AM, PM" },
    { directive: "%X", description: "Time representation", example: "14:55:02" },
  ],
  Day: [
    { directive: "%a", description: "Abbreviated weekday name", example: "Sun, Mon, ..." },
    { directive: "%A", description: "Full weekday name", example: "Sunday, Monday, ..." },
    { directive: "%w", description: "Weekday as a decimal number (0-6)", example: "0, 1, ..., 6" },
    { directive: "%d", description: "Day of the month (01-31)", example: "01, 02, ..., 31" },
    { directive: "%j", description: "Day of the year (001-366)", example: "001, 002, ..., 366" },
  ],
  Week: [
    { directive: "%U", description: "Week number, Sunday-based (00-53)", example: "00, 01, ..., 53" },
    { directive: "%W", description: "Week number, Monday-based (00-53)", example: "00, 01, ..., 53" },
  ],
  Month: [
    { directive: "%b", description: "Abbreviated month name", example: "Jan, Feb, ..." },
    { directive: "%B", description: "Full month name", example: "January, February, ..." },
    { directive: "%m", description: "Month as a number (01-12)", example: "01, 02, ..., 12" },
  ],
  Year: [
    { directive: "%y", description: "Year, last two digits (00-99)", example: "00, 01, ..., 99" },
    { directive: "%Y", description: "Year", example: "1970, 1988, 2001, 2013" },
  ],
  Timezone: [
    { directive: "%z", description: "UTC offset", example: "+0000, -0400, +0530" },
    { directive: "%Z", description: "Timezone name or abbreviation", example: "UTC, EST, CST" },
  ],
  Other: [
    { directive: "%c", description: "Date and time representation", example: "Tue Aug 16 21:30:00 1988" },
    { directive: "%x", description: "Date representation", example: "08/23/01, 08/23/2001" },
    { directive: "%%", description: "A % sign", example: "%" },
  ],
};

type Preferences = {
  defaultAction: string;
};

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  return (
    <List isLoading={false} searchBarPlaceholder="Filter by Code, Meaning or Example...">
      {Object.entries(strftimeCodes).map(([section, directives]) => (
        <List.Section key={section} title={section}>
          {directives.map((directive) => (
            <List.Item
              key={directive.directive}
              title={directive.directive}
              subtitle={directive.description}
              accessories={[{ text: directive.example }]}
              keywords={[directive.description, directive.example]}
              icon={{
                source: Icon.Clock,
                tintColor: sectionToColor(section),
              }}
              actions={
                <ActionPanel>
                  {preferences.defaultAction === "copy" && (
                    <>
                      <Action.CopyToClipboard content={directive.directive} />
                      <Action.Paste content={directive.directive} />
                    </>
                  )}
                  {preferences.defaultAction === "paste" && (
                    <>
                      <Action.Paste content={directive.directive} />
                      <Action.CopyToClipboard content={directive.directive} />
                    </>
                  )}
                  <Action.OpenInBrowser url={getStrftimeDocsUrl()} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function sectionToColor(section: string): Color {
  switch (section) {
    case "Time":
      return Color.Green;
    case "Day":
      return Color.Blue;
    case "Week":
      return Color.Yellow;
    case "Month":
      return Color.Orange;
    case "Year":
      return Color.Red;
    case "Timezone":
      return Color.Purple;
    default:
      return Color.Magenta;
  }
}

function getStrftimeDocsUrl(): string {
  return "https://strftime.org/";
}
