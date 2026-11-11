import { toggleRecording } from "./lib/recording";

export default async function Command() {
  await toggleRecording("window");
}
