import { getData } from "swift:../../swift/AppleReminders";

export default async function () {
  const { reminders } = await getData();
  return reminders;
}
