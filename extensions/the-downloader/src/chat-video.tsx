import { LaunchProps } from "@raycast/api";
import { isValidUrl } from "./utils.js";
import { ChatHome } from "./views/chat-home.js";
import { VideoChat } from "./views/video-chat.js";

type ChatLaunchContext = { url?: string; question?: string };

export default function Command(props: LaunchProps<{ arguments: Arguments.ChatVideo }>) {
  const context = props.launchContext as ChatLaunchContext | undefined;
  const url = (props.arguments.url?.trim() || context?.url?.trim()) ?? "";
  if (isValidUrl(url)) return <VideoChat url={url} initialQuestion={context?.question} />;
  return <ChatHome initialText={url} />;
}
