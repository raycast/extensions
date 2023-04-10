import moment from "moment";
import { SlackStatusPreset } from "./interfaces";

export function statusExpirationText(expirationTimestamp: number): string {
  const expirationDate = moment(expirationTimestamp);

  const isTomorrow = isTomorrowOrAlmostTomorrow(expirationDate);
  if (isTomorrow) {
    return "Until tomorrow";
  } else if (!isToday(expirationDate)) {
    return `Until ${expirationDate.format("dddd, MMMM Do, HH:mm")}`;
  }

  const durationInSeconds = expirationDate.diff(moment(), "seconds");
  const duration = moment.duration(durationInSeconds, "seconds");

  const durationInDays = Math.floor(duration.asDays());
  const durationInHours = Math.floor(duration.subtract(durationInDays, "days").asHours());
  const durationInMinutes = Math.floor(duration.subtract(durationInHours, "hours").asMinutes());

  let relativeDuration = "";

  if (durationInHours > 0 && durationInMinutes > 0) {
    relativeDuration += durationInHours + "h " + durationInMinutes + "m ";
  } else if (durationInHours > 0) {
    relativeDuration = pluralize(durationInHours, "hour");
  } else if (durationInMinutes > 0) {
    relativeDuration = pluralize(durationInMinutes, "minute");
  } else {
    relativeDuration = "a minute";
  }

  return `Clears in ${relativeDuration}`;
}

function isTomorrowOrAlmostTomorrow(date: moment.Moment) {
  // Slack treats "tomorrow" as 1 minute before midnight, hence this little hack
  return date.add(1, "minute").isSame(moment().add(1, "day"), "day");
}

function isToday(date: moment.Moment) {
  return date.isSame(new Date(), "day");
}

export function durationToString(duration: number): string {
  if (duration == 0) {
    return "Don't clear";
  }
  if (duration >= 60) {
    const hours = Math.round((duration * 10) / 60) / 10;
    return pluralize(hours, "hour");
  }
  return pluralize(duration, "minute");
}

function pluralize(count: number, noun: string, suffix = "s") {
  return `${count} ${noun}${count !== 1 ? suffix : ""}`;
}

export function keyForStatusPreset(status: SlackStatusPreset) {
  return `${status.emojiCode}_${status.title}_${status.defaultDuration}`;
}
