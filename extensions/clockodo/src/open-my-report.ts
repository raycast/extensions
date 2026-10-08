import { open } from "@raycast/api";
import { getMe } from "./clockodo";

export default async function Command() {
  const user = await getMe();
  await open(`https://my.clockodo.com/userreport/userreport/?usersId=${user.data.id}`);
}
