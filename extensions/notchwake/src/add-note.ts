import { LaunchProps } from "@raycast/api";
import { invalid, run } from "./notchwake";

export default async function Command(props: LaunchProps<{ arguments: Arguments.AddNote }>) {
  const text = props.arguments.text.trim().slice(0, 2000);
  if (!text) return invalid("The note is empty.");
  await run("note", { text }, "Added to note");
}
