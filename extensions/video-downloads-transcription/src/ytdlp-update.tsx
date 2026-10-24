import { LocalStorage, Toast, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { Settings } from "./core";
import {
  compareVersions,
  latestYtDlpVersion,
  updateYtDlp,
  ytDlpVersion,
} from "./updates";
import { errorMessage } from "./video";

const checkEvery = 12 * 60 * 60 * 1000;

/**
 * The installed and newest yt-dlp versions. The newest release is looked up
 * on GitHub at most twice a day.
 */
export function useYtDlpUpdate(settings: Settings) {
  const [versions, setVersions] = useState<{
    current?: string;
    latest?: string;
  }>({});

  useEffect(() => {
    let active = true;
    (async () => {
      const current = await ytDlpVersion(settings);
      let latest: string | undefined;
      try {
        const cached = JSON.parse(
          (await LocalStorage.getItem<string>("ytDlpLatest")) ?? "null",
        ) as { version: string; checkedAt: number } | null;
        if (cached && Date.now() - cached.checkedAt < checkEvery)
          latest = cached.version;
      } catch {
        /* check again */
      }
      if (!latest) {
        latest = await latestYtDlpVersion();
        await LocalStorage.setItem(
          "ytDlpLatest",
          JSON.stringify({ version: latest, checkedAt: Date.now() }),
        );
      }
      if (active) setVersions({ current, latest });
    })().catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const { current, latest } = versions;
  return {
    current,
    latest,
    outdated: Boolean(
      current && latest && compareVersions(current, latest) < 0,
    ),
    async update() {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Updating yt-dlp…",
      });
      try {
        const version = await updateYtDlp(settings);
        setVersions((value) => ({ ...value, current: version }));
        if (latest && compareVersions(version, latest) < 0) {
          toast.style = Toast.Style.Failure;
          toast.title = `yt-dlp is still ${version}`;
          toast.message = `Version ${latest} isn't available from your package manager yet. Try again later.`;
        } else {
          toast.style = Toast.Style.Success;
          toast.title = `yt-dlp updated to ${version}`;
        }
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Could not update yt-dlp";
        toast.message = errorMessage(error);
      }
    },
  };
}
