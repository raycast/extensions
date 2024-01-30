import { useEffect, useState } from "react";
import { formatPlayingState, getLatestState } from "./sonos";

export function useSerializedState() {
  const [title, setTitle] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function run() {
      const state = await getLatestState();
      const title = await formatPlayingState(state);

      setTitle(title);
      setLoading(false);
    }

    run();
  }, []);

  return {
    title,
    loading,
  };
}
