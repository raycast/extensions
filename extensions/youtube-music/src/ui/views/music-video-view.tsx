import { Detail, Icon } from "@raycast/api";
import type { VideoInfo } from "../../models/now-playing";
import NowPlayingActionsPanel from "../actions-panel";
import VolumeMetadataLabel from "../volume-metadata-label";
import TitleMetadataLabel from "../title-metadata-label";
import NowPlayingNavigationTitle from "../now-playing-navigation-title";
import Duration from "../duration";
import { coverMarkdown } from "../cover";

interface VideoViewProps {
  videoInfo: VideoInfo;
  skipSeconds: number;
  isLoading: boolean;
}

export default function VideoView({ videoInfo, skipSeconds, isLoading }: VideoViewProps) {
  const markdown = coverMarkdown(videoInfo.coverUrl, 350, 350, "Cover");

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={NowPlayingNavigationTitle({ isPlaying: videoInfo.isPlaying })}
      metadata={
        <Detail.Metadata>
          <TitleMetadataLabel title={videoInfo.title} isLiked={videoInfo.isLiked} />
          <Detail.Metadata.Label title="Channel" text={videoInfo.channel} icon={Icon.Person} />
          <Detail.Metadata.Label title="Views" text={videoInfo.views} icon={Icon.Eye} />
          <Detail.Metadata.Label title="Likes" text={videoInfo.likes} icon={Icon.Heart} />
          <Duration currentTime={videoInfo.currentTime} duration={videoInfo.duration} />
          <VolumeMetadataLabel volume={videoInfo.volume} isMuted={videoInfo.isMuted} />
        </Detail.Metadata>
      }
      actions={<NowPlayingActionsPanel info={videoInfo} skipSeconds={skipSeconds} />}
    />
  );
}
