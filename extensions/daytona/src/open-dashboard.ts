import { open } from "@raycast/api";

export default async function OpenDashboardCommand() {
  await open("https://app.daytona.io/");
}
