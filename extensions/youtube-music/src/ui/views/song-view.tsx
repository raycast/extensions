import { Detail, Icon } from "@raycast/api";
import { coverMarkdown } from "../cover";
import type { SongInfo } from "../../models/now-playing";
import NowPlayingActionsPanel from "../actions-panel";
import VolumeMetadataLabel from "../volume-metadata-label";
import TitleMetadataLabel from "../title-metadata-label";
import NowPlayingNavigationTitle from "../now-playing-navigation-title";
import Duration from "../duration";

interface SongViewProps {
  songInfo: SongInfo;
  skipSeconds: number;
  isLoading: boolean;
}

export default function SongView({ songInfo, skipSeconds, isLoading }: SongViewProps) {
  const markdown = coverMarkdown(songInfo.coverUrl, 350, 350, "Album Cover");

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={NowPlayingNavigationTitle({ isPlaying: songInfo.isPlaying })}
      metadata={
        <Detail.Metadata>
          <TitleMetadataLabel title={songInfo.title} isLiked={songInfo.isLiked} />
          <Detail.Metadata.Label title="Artist" text={songInfo.artist} icon={Icon.Person} />
          <Detail.Metadata.Label title="Album" text={songInfo.album} icon={Icon.Music} />
          <Detail.Metadata.Label title="Year" text={songInfo.year} icon={Icon.Calendar} />
          <Duration currentTime={songInfo.currentTime} duration={songInfo.duration} />
          <VolumeMetadataLabel volume={songInfo.volume} isMuted={songInfo.isMuted} />
        </Detail.Metadata>
      }
      actions={<NowPlayingActionsPanel info={songInfo} skipSeconds={skipSeconds} />}
    />
  );
}
