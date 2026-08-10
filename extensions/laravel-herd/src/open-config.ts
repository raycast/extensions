import { open } from "@raycast/api";
import { homedir } from "os";

export default async function main() {
  const path = `${homedir()}/Library/Application Support/Herd`;
  await open(path);
}
