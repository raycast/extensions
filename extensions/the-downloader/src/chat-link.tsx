import { LaunchProps } from "@raycast/api";
import { isValidUrl } from "./utils.js";
import { ChatHome } from "./views/chat-home.js";
import { LinkChat } from "./views/link-chat.js";

type ChatLaunchContext = { url?: string; question?: string };

export default function Command(props: LaunchProps<{ arguments: Arguments.ChatLink }>) {
  const context = props.launchContext as ChatLaunchContext | undefined;
  const url = (props.arguments.url?.trim() || context?.url?.trim()) ?? "";
  if (isValidUrl(url)) return <LinkChat url={url} initialQuestion={context?.question} />;
  return <ChatHome initialText={url} />;
}
