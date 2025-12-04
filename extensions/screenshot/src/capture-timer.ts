import { closeMainWindow } from "@raycast/api";
import { Form, LaunchProps } from "@raycast/api";

import { exec } from "child_process";

interface Args {
  time?: string;
}

export default async (props: LaunchProps<{ arguments: Args }>) => {
  if (props.arguments.time) {
    exec(`/usr/sbin/screencapture -i -p -T ${props.arguments.time}`);
  } else {
    exec("/usr/sbin/screencapture -i -p -T 5");
  }
  await closeMainWindow();
};
