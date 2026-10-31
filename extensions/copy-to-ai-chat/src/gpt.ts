import { LaunchProps } from "@raycast/api";
import { openChat } from "./open-chat";

export default async function Command({
  arguments: args,
}: LaunchProps<{ arguments: Arguments.Gpt }>) {
  await openChat("chatgpt", { query: args.query });
}
