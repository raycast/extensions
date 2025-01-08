import { exec } from "child_process";
import { useState } from "react";

type TrackInfo = {
  name: string;
  artist: string;
  artworkUrl: string;
};

const useSpotifyNowPlaying = () => {
  const [track, setTrack] = useState<TrackInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchTrackInfo = () => {
    const script = `
      tell application "Spotify"
        if player state is playing then
          set trackName to name of current track
          set trackArtist to artist of current track
          set artworkURL to artwork url of current track
          return trackName & "||" & trackArtist & "||" & artworkURL
        else
          return "|||"
        end if
      end tell
    `;

    exec(`osascript -e '${script}'`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error fetching Spotify info: ${error.message}`);
        setTrack(null);
        setIsLoading(false);
        return;
      }
      if (stderr) {
        console.error(`Stderr: ${stderr}`);
        setTrack(null);
        setIsLoading(false);
        return;
      }

      const [name, artist, artworkUrl] = stdout.trim().split("||");
      if (name && artist && artworkUrl) {
        if (track?.artworkUrl !== artworkUrl && track?.name !== name && track?.artist !== artist) {
          setTrack({
            name,
            artist,
            artworkUrl,
          });
        }
      } else {
        setTrack(null);
      }
      setIsLoading(false);
    });
  };

  fetchTrackInfo();

  return { track, isLoading };
};

export default useSpotifyNowPlaying;
