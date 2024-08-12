import {
  LaunchProps,
  closeMainWindow,
  open,
  showToast,
  Toast,
} from "@raycast/api";
import { constructPostIntent } from "./lib/post-intent";

interface Arguments {
  text?: string;
  attachment?: string;
}

export default async function Command(
  props: LaunchProps<{ arguments: Arguments }>,
) {
  const { text, attachment } = props.arguments;

  const url = constructPostIntent({ text, attachment });

  await closeMainWindow();
  await open(url);
}
