import { LaunchProps, closeMainWindow, open } from "@raycast/api";

interface Arguments {
  delay?: string;
}

export default async function Command(props: LaunchProps<{ arguments: Arguments }>) {
  const url = "shottr://grab/delayed";
  await closeMainWindow();
  open(url + "?t=" + props?.arguments?.delay || "3");
}
