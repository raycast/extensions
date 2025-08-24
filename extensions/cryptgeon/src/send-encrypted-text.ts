import "./fetch.js";

import { LaunchProps } from "@raycast/api";
import { createNote } from "./shared.js";

export default async function Command(props: LaunchProps<{ arguments: { text: string } }>) {
  await createNote(props.arguments.text, { views: 1, expiration: undefined });
}
