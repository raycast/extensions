import { LaunchProps, closeMainWindow, open } from "@raycast/api";
import { constructPostIntent } from "./lib/post-intent";

export default async function Command(props: LaunchProps<{ arguments: Arguments.QuickThread }>) {
  const { text, attachment } = props.arguments;

  const url = constructPostIntent({ text, attachment });

  await closeMainWindow();
  await open(url);
}
