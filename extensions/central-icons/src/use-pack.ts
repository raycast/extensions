import { showToast, Toast } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { ensurePack, type Pack } from "./pack";

export function usePack(): {
  pack: Pack | null;
  packError: string | null;
  reload: () => Promise<void>;
} {
  const [pack, setPack] = useState<Pack | null>(null);
  const [packError, setPackError] = useState<string | null>(null);
  const started = useRef(false);

  async function load(showUpdateToast: boolean) {
    let toast: Toast | undefined;
    let latestMessage = "";
    const onProgress = (message: string) => {
      latestMessage = message;
      if (toast) {
        toast.title = message;
      } else {
        showToast({ style: Toast.Style.Animated, title: message }).then((t) => {
          toast = t;
          t.title = latestMessage;
        });
      }
    };
    try {
      const result = await ensurePack(onProgress);
      setPack(result.pack);
      setPackError(null);
      if (toast) {
        toast.style = Toast.Style.Success;
        toast.title = `Icons Ready (v${result.pack.version})`;
        setTimeout(() => toast?.hide(), 2000);
      } else if (showUpdateToast) {
        await showToast({
          style: Toast.Style.Success,
          title: result.updated
            ? `Icons Updated to v${result.pack.version}`
            : `Icons Are Up to Date (v${result.pack.version})`,
        });
      }
    } catch (error) {
      if (toast) {
        toast.style = Toast.Style.Failure;
        toast.title = "Couldn't Load Icons";
      }
      setPackError(error instanceof Error ? error.message : String(error));
    }
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    load(false);
  }, []);

  return { pack, packError, reload: () => load(true) };
}
