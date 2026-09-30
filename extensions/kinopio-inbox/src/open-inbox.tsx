import { open } from "@raycast/api";

export default async () => {
  console.log("🎑 open /inbox");
  await open("http://kinopio.club/inbox");
};
