import { LaunchProps } from "@raycast/api";
import { control } from "./lib/kaiku";

export default async function Command(props: LaunchProps<{ arguments: Arguments.StartRecording }>) {
  const title = props.arguments.title?.trim();
  await control(title ? `record/start?title=${encodeURIComponent(title)}` : "record/start", "Recording started");
}
