import { open } from "@raycast/api";
import { constructMouselessUri } from "./utils";

export default async function main() {
  await open(constructMouselessUri("show-overlay"));
}
