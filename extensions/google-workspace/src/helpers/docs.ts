import { open } from "@raycast/api";
import { getUserEmail } from "../api/googleAuth";

export type Prefix = "document" | "forms" | "spreadsheets" | "presentation";

export async function createDocFromUrl(prefix: Prefix, title?: string) {
  const email = await getUserEmail();

  const baseUrl = `https://docs.google.com/${prefix}/create`;

  const searchParams = new URLSearchParams();
  if (title) {
    searchParams.append("title", title);
  }
  if (email) {
    searchParams.append("authuser", email);
  }

  const url = baseUrl + "?" + searchParams.toString();

  await open(url);
}
