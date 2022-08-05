import { open } from "@raycast/api";
import { getEmail } from "../api/oauth";

export async function createDocFromUrl(prefix: string, title?: string) {
  const email = await getEmail();

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
