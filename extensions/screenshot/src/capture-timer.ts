import { closeMainWindow, LaunchProps } from "@raycast/api";
import { exec } from "child_process";

export default async (props: LaunchProps<{ arguments: { time?: string } }>) => {
  const delay = props.arguments.time || "5"; // Defaults to 5 if empty
  exec(`/usr/sbin/screencapture -T ${delay} ~/Desktop/timed_shot.png`);
  await closeMainWindow();
};
