import { MenuBarExtra } from "@raycast/api";
import { getActiveCoordinator, isPlaying, formatPlayingState } from "./sonos";
import { useEffect, useState } from "react";

export default function Command() {
  const [title, setTitle] = useState("");

  useEffect(() => {
    async function run() {
      const coordinator = await getActiveCoordinator();

      if (coordinator === undefined) {
        return null;
      }

      const state = await coordinator.GetState();
      const playing = await isPlaying(coordinator);

      const title = formatPlayingState({
        playing,
        state,
      });

      setTitle(title);
    }

    run();
  }, []);

  return <MenuBarExtra isLoading={title === ""} title={title}></MenuBarExtra>;
}
