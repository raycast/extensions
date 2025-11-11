import { ping } from "./helper/pinger";

export default async function Command() {
  await ping("google.com");

  return;
}
