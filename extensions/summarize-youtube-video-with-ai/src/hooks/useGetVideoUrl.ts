import { BrowserExtension, Clipboard, environment, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import ytdl from "ytdl-core";
import { GETTING_VIDEO_URL } from "../const/toast_messages";

export const useGetVideoUrl = async (input: string | undefined) => {
  const [videoURL, setVideoURL] = useState<string | undefined>();

  useEffect(() => {
    showToast({
      style: Toast.Style.Animated,
      title: GETTING_VIDEO_URL.title,
      message: GETTING_VIDEO_URL.message,
    });

    if (input && ytdl.validateURL(input)) {
      setVideoURL(input);
      return;
    }

    const fetchData = async () => {
      if (!input && environment.canAccess(BrowserExtension)) {
        const tabs = await BrowserExtension.getTabs();
        tabs.forEach((tab) => {
          if (tab.active && ytdl.validateURL(tab.url)) {
            setVideoURL(tab.url);
          }
        });
      }

      const text = await Clipboard.readText();

      if (!input && text && (ytdl.validateURL(text) || ytdl.validateID(text))) {
        setVideoURL(text);
      }

      if (!input && !videoURL && !text) {
        showToast({
          style: Toast.Style.Failure,
          title: "Invalid URL/ID",
          message: "The passed URL/ID is invalid, please check your input.",
        });
        return null;
      }
    };

    fetchData();
  }, []);

  return videoURL;
};
