import { open } from "@raycast/api";

// Kagi News (news.kagi.com).
export default async function Command() {
  await open("https://news.kagi.com");
}
