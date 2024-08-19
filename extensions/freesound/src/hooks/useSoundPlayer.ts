import { fetch } from "cross-fetch";
import { ExecaError, execa } from "execa";
import { useCallback, useEffect, useState } from "react";

import { showFailureToast } from "@raycast/utils";

import { ensureDir, fileExists, getFileName, soundPath, writeFile } from "@/lib/file";

const prepare = async () => {
  await ensureDir(soundPath());
};

export type PlayState = {
  filePath: string | null;
  id: number | null;
};

const useSoundPlayer = () => {
  const [lastUrl, setLastUrl] = useState<string | null>(null);
  const [playState, setPlayState] = useState<PlayState>({ filePath: null, id: null });

  useEffect(() => {
    prepare();
  }, []);

  useEffect(() => {
    let controller: AbortController | null = null;
    const play = async () => {
      if (playState.filePath === null) {
        return;
      }
      controller = new AbortController();
      try {
        await execa({
          cancelSignal: controller.signal,
          gracefulCancel: false,
        })`afplay ${playState.filePath}`;
      } catch (error) {
        if (error instanceof ExecaError && error.isCanceled) {
          return;
        }
        showFailureToast(error, { title: "Error while using Soundplayer" });
      }
      setPlayState((oldState) => ({ ...oldState, filePath: null }));
    };

    play();

    return () => {
      controller?.abort();
    };
  }, [playState]);

  const stop = useCallback(() => {
    setPlayState((oldState) => ({ ...oldState, filePath: null }));
  }, []);

  const playSound = useCallback(
    async (soundUrl: string, id: number) => {
      const fileName = getFileName(soundUrl);
      if (!fileName) {
        return;
      }
      const filePath = soundPath(fileName);
      const exists = await fileExists(filePath);
      if (!exists) {
        const response = await fetch(soundUrl);
        const buffer = await response.arrayBuffer();
        await writeFile(fileName, buffer);
      }
      setLastUrl(soundUrl);
      setPlayState({ filePath, id });
    },
    [lastUrl, playState.filePath],
  );

  return { playSound, playState, stop };
};

export default useSoundPlayer;
