import moment from "moment";

export const formatDuration = (minutes: number) => {
  const duration = moment.duration(minutes, "minutes");

  if (minutes >= 60) {
    return `${duration.hours()} hours ${duration.minutes()} minutes`;
  } else {
    return `${duration.minutes()} minutes`;
  }
};
