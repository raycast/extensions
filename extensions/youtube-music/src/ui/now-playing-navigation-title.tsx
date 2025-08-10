interface NowPlayingNavigationTitleProps {
  isPlaying: boolean;
}

export default function NowPlayingNavigationTitle({ isPlaying }: NowPlayingNavigationTitleProps) {
  return isPlaying ? "Now Playing ▶️" : "Paused ⏸️";
}
