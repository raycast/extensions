import { requestRecording } from "./lib/recording";
export default async function Command() {
  await requestRecording("end-live");
}
