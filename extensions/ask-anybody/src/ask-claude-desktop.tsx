import { LaunchProps } from "@raycast/api";
import { openChat } from "./open-chat";

export default async function Command(
  props: LaunchProps<{ arguments: { query: string } }>,
) {
  await openChat(
    props,
    "Claude",
    (q) => `claude://claude.ai/new?q=${encodeURIComponent(q)}`,
  );
}
