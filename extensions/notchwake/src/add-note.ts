import { LaunchProps } from "@raycast/api";
import { invalid, run } from "./notchwake";

export default async function Command(props: LaunchProps<{ arguments: Arguments.AddNote }>) {
  const text = props.arguments.text.trim();
  if (!text) return invalid("The note is empty.");
  if (text.length > 2000) return invalid("Use 2,000 characters or fewer.");
  await run("note", { text }, "Added to note");
}
