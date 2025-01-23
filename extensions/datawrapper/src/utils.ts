import moment from "moment";

// convert utc date from api response to relative string (ie: "2 hours ago" or "3 days ago")
export function date(x: string) {
  return moment(x, "YYYY-MM-DD HH:mm:ss").utc(true).fromNow();
}
