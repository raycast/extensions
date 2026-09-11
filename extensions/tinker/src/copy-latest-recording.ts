import { copyLatestRecording } from "./lib/tinker";

export default async function Command() {
  await copyLatestRecording();
}
