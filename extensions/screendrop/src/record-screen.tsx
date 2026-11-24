import { run } from "./run";

export default async function Command() {
  await run("screendrop://record-screen");
}
