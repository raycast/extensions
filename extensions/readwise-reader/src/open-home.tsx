import { open, closeMainWindow } from "@raycast/api";
import { BASE_URL } from "./utils";

export default async function Home() {
  await open(BASE_URL + "home");
  await closeMainWindow();
}
