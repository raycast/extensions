import { getCacheFilepath } from "@lib/cache";
import { apex } from "@lib/common";
import { State } from "@lib/apexapi";
import { getErrorMessage } from "@lib/utils";
import fs from "fs/promises";
import { useEffect, useState } from "react";
import { getCameraRefreshInterval } from "./grid";
import { getVideoStreamUrlFromCamera } from "./utils";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function useImage(
  state: State,
  defaultIcon?: string,
): {
  localFilepath?: string;
  error?: string;
  isLoading: boolean;
  imageFilepath?: string;
} {
  const entityID = state.entity_id;
  const [localFilepath, setLocalFilepath] = useState<string | undefined>(defaultIcon);
  const [imageFilepath, setImageFilepath] = useState<string | undefined>(defaultIcon);
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    let didUnmount = false;
    let previousFilepath: string | undefined;
    const controller = new AbortController();

    async function saveFrame(frame: Buffer) {
      if (didUnmount) {
        return;
      }
      const newFilepath = await getCacheFilepath(`img_${entityID}_${Date.now()}.png`, true);
      await fs.writeFile(newFilepath, frame);
      setLocalFilepath(`data:image/jpeg;base64,${frame.toString("base64")}`);
      setImageFilepath(newFilepath);
      setIsLoading(false);
      const toDelete = previousFilepath;
      previousFilepath = newFilepath;
      if (toDelete) {
        await fs.unlink(toDelete).catch(() => undefined);
      }
    }

    // Keep a single stream connection open rather than reopening one per
    // refresh: some cameras/integrations stop responding for minutes if a
    // new stream session is opened every couple of seconds. Reconnect with a
    // short backoff if the connection drops.
    async function runStream(streamUrl: string) {
      for (;;) {
        if (didUnmount) {
          return;
        }
        let lastSaved = 0;
        try {
          await apex.readCameraStream(streamUrl, controller.signal, async (frame) => {
            const interval = getCameraRefreshInterval() ?? 0;
            const now = Date.now();
            if (now - lastSaved < interval) {
              return;
            }
            lastSaved = now;
            await saveFrame(frame);
          });
          return; // signal aborted cleanly on unmount
        } catch (error) {
          if (didUnmount) {
            return;
          }
          setError(getErrorMessage(error));
          await delay(1000);
        }
      }
    }

    async function runPolling() {
      for (;;) {
        if (didUnmount) {
          return;
        }
        try {
          const newFilepath = await getCacheFilepath(`img_${entityID}_${Date.now()}.png`, true);
          await apex.getCameraProxyURL(entityID, newFilepath);
          await saveFrame(await fs.readFile(newFilepath));
          await fs.unlink(newFilepath).catch(() => undefined);
          setError(undefined);
        } catch (error) {
          if (!didUnmount) {
            setError(getErrorMessage(error));
          }
        }
        const interval = getCameraRefreshInterval();
        if (!interval || interval <= 0) {
          return;
        }
        await delay(interval);
      }
    }

    setIsLoading(true);
    const streamUrl = getVideoStreamUrlFromCamera(state);
    const run = streamUrl ? runStream(streamUrl) : runPolling();
    run.finally(() => {
      if (!didUnmount) {
        setIsLoading(false);
      }
    });

    return () => {
      didUnmount = true;
      controller.abort();
      if (previousFilepath) {
        fs.unlink(previousFilepath).catch(() => undefined);
      }
    };
  }, [entityID]);

  return { localFilepath, error, isLoading, imageFilepath };
}
