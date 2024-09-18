import { open } from "@raycast/api";
import { BASE_URL } from "./utils";

export default async function Main() {
  await open(BASE_URL + "search");
}
