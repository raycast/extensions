import { runToggle } from "./run-toggle";

export default async function command() {
  await runToggle("record");
}
