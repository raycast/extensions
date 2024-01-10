import { Color, Icon, List, getPreferenceValues } from "@raycast/api";
import dayjs, { OpUnitType } from "dayjs";
import isToday from "dayjs/plugin/isToday";
import isYesterday from "dayjs/plugin/isYesterday";
dayjs.extend(isToday);
dayjs.extend(isYesterday);

const TIME_INTERVAL_REGEX = /^(?<number>[0-9]+)(?<unit>[d|w|M|y|h|m|s])$/;

interface Preferences {
  jiraInstance?: string;
  softWarningDateThreshold?: string;
  hardWarningDateThreshold?: string;
}
const preferences = getPreferenceValues<Preferences>();

export function checkConfig() {
  if ((preferences.jiraInstance ?? "") === "") {
    console.log("Jira instance URL is unset. Jira links disabled");
  }

  if (
    (preferences.softWarningDateThreshold ?? "") !== "" &&
    !preferences.softWarningDateThreshold?.match(TIME_INTERVAL_REGEX)
  ) {
    console.log(
      `Invalid value '${preferences.softWarningDateThreshold}' for soft warning date threshold. ` + "Colours disabled",
    );
  }

  if (
    (preferences.hardWarningDateThreshold ?? "") !== "" &&
    !preferences.hardWarningDateThreshold?.match(TIME_INTERVAL_REGEX)
  ) {
    console.log(
      `Invalid value '${preferences.hardWarningDateThreshold}' for hard warning date threshold. ` + "Colours disabled",
    );
  }
}

export function relativeDateAccessory(date: string, event: string, coloured?: boolean): List.Item.Accessory {
  const tooltip = eventRelativeDateMessage(event, date);

  if (
    coloured &&
    preferences.hardWarningDateThreshold &&
    dateIsPastInterval(date, preferences.hardWarningDateThreshold)
  ) {
    return {
      date: { value: new Date(date), color: Color.Red },
      icon: { source: Icon.Warning, tintColor: Color.Red },
      tooltip,
    };
  }

  if (
    coloured &&
    preferences.softWarningDateThreshold &&
    dateIsPastInterval(date, preferences.softWarningDateThreshold)
  ) {
    return {
      date: { value: new Date(date), color: Color.Yellow },
      tooltip,
    };
  }

  return { date: new Date(date), tooltip };
}

function dateIsPastInterval(date: string, timeInterval: string): boolean {
  const match = timeInterval.match(TIME_INTERVAL_REGEX);
  if (match === null) {
    return false;
  }
  const { number, unit } = match.groups!;
  return dayjs().diff(date, unit as OpUnitType, true) > parseInt(number);
}

function eventRelativeDateMessage(event: string, dateString: string) {
  const date = dayjs(dateString);
  const hhmm = date.format("HH:mm");
  if (date.isToday()) {
    return `${event} today @ ${hhmm}`;
  }
  if (date.isYesterday()) {
    return `${event} yesterday @ ${hhmm}`;
  }
  if (dayjs().diff(date, "w") < 1) {
    return `${event} last ${date.format("dddd")} @ ${hhmm}`;
  }
  return `${event} on ${date.format("DD MMM")} @ ${hhmm}`;
}
