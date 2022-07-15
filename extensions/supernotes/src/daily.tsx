import { open } from "@raycast/api";
import { SUPERNOTES_VIEW_URL } from "utils/defines";

export default async function daily() {
  const dateToString = (date: Date) => {
    return new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000).toISOString().split("T")[0];
  };

  const today = new Date();
  await open(`${SUPERNOTES_VIEW_URL}/${dateToString(today)}`);
}
