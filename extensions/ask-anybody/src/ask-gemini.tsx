import { LaunchProps } from "@raycast/api";
import { openChat } from "./open-chat";

export default async function Command(
  props: LaunchProps<{ arguments: { query: string } }>,
) {
  await openChat(
    props,
    "Gemini",
    (q) => `https://gemini.google.com/app?q=${encodeURIComponent(q)}`,
  );
}
