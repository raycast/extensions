import { LaunchProps } from "@raycast/api";
import { isValidUrl, normalizeUrl } from "./utils.js";
import { ChatHome } from "./views/chat-home.js";
import { LinkChat } from "./views/link-chat.js";

type ChatLaunchContext = { url?: string };

export default function Command(props: LaunchProps<{ arguments: Arguments.ChatLink }>) {
  const context = props.launchContext as ChatLaunchContext | undefined;
  const url = (props.arguments.url?.trim() || context?.url?.trim()) ?? "";
  // Normalized, so Open Link and the saved chat get a real URL even for `youtube.com/…`.
  if (isValidUrl(url)) return <LinkChat url={normalizeUrl(url)} root />;
  return <ChatHome initialText={url} />;
}
