import { OpenInBrowserAction, PushAction } from "@raycast/api";
import { SearchVideoList } from "./video_search";

export function OpenChannelInBrowser(props: { channelId: string | undefined }): JSX.Element | null {
  const channelId = props.channelId;
  if (channelId) {
    return <OpenInBrowserAction title="Open Channel in Browser" url={`https://youtube.com/channel/${channelId}`} />;
  }
  return null;
}

export function SearchChannelVideosAction(props: { channelId: string | undefined }): JSX.Element | null {
  const cid = props.channelId;
  if (cid) {
    return <PushAction title="Search Channel Videos" target={<SearchVideoList channedId={cid} />} />;
  }
  return null;
}
