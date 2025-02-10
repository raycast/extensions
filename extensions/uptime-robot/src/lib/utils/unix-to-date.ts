import dayjs from "dayjs";

export default function unixToDate(unix: number) {
  return dayjs.unix(unix).toDate();
}
