import { OpenInBrowserAction } from "@raycast/api";

export function OpenChannelInBrowser(props: { channelId: string | undefined }): JSX.Element | null {
  const channelId = props.channelId;
  if (channelId) {
    return <OpenInBrowserAction title="Open Channel in Browser" url={`https://youtube.com/channel/${channelId}`} />;
  }
  return null;
}
