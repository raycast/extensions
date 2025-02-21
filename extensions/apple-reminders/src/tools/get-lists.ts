import { getData } from "swift:../../swift/AppleReminders";

export default async function () {
  const { lists } = await getData();
  return lists;
}
