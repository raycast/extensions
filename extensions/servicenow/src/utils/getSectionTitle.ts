import TimeAgo from "javascript-time-ago";
import en from "javascript-time-ago/locale/en";
import { differenceInMinutes } from "date-fns";

TimeAgo.addDefaultLocale(en);
const timeAgo = new TimeAgo("en-US");

export const getSectionTitle = (dateTime: string) => {
  const utcDate = new Date(dateTime + " UTC");
  const diffInMinutes = differenceInMinutes(new Date(), utcDate);

  if (diffInMinutes < 1) {
    return "Just now";
  } else if (diffInMinutes < 3) {
    return "1 minute ago";
  } else if (diffInMinutes < 5) {
    return "3 minutes ago";
  } else if (diffInMinutes < 10) {
    return "5 minutes ago";
  } else if (diffInMinutes < 20) {
    return "10 minutes ago";
  } else if (diffInMinutes < 30) {
    return "20 minutes ago";
  } else if (diffInMinutes < 40) {
    return "30 minutes ago";
  } else if (diffInMinutes < 50) {
    return "40 minutes ago";
  } else if (diffInMinutes < 60) {
    return "50 minutes ago";
  } else {
    return timeAgo.format(utcDate);
  }
};
