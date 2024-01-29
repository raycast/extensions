import { MenuBarExtra } from "@raycast/api";
import { isPlaying, formatPlayingState, getLatestState } from "./sonos";
import { useEffect, useState } from "react";

export default function Command() {
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function run() {
      const state = await getLatestState();
      const playing = await isPlaying();

      const title = formatPlayingState({
        playing,
        state,
      });

      setTitle(title);
      setLoading(false);
    }

    run();
  }, []);

  return <MenuBarExtra isLoading={loading} title={title} />;
}
