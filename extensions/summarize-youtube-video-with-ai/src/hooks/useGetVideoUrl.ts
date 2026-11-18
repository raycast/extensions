import { BrowserExtension, Clipboard, environment, popToRoot, showToast, Toast } from "@raycast/api";
import { useEffect } from "react";
import {
  GETTING_VIDEO_URL,
  GETTING_VIDEO_URL_FROM_BROWSER,
  GETTING_VIDEO_URL_FROM_CLIPBOARD,
} from "../const/toast_messages";
import { getYouTubeVideoUrl } from "../utils/youtubeUrl";

export const useGetVideoUrl = ({
  input,
  setVideoURL,
}: {
  input: string | undefined | null;
  setVideoURL: React.Dispatch<React.SetStateAction<string | null | undefined>>;
}) => {
  useEffect(() => {
    const fetchData = async () => {
      showToast({
        style: Toast.Style.Animated,
        title: GETTING_VIDEO_URL.title,
        message: GETTING_VIDEO_URL.message,
      });

      const inputVideoUrl = getYouTubeVideoUrl(input);

      if (inputVideoUrl) {
        setVideoURL(inputVideoUrl);
        return;
      }

      const clipboardText = await Clipboard.readText();
      const clipboardVideoUrl = getYouTubeVideoUrl(clipboardText);

      if (!input && clipboardVideoUrl) {
        showToast({
          style: Toast.Style.Animated,
          title: GETTING_VIDEO_URL_FROM_CLIPBOARD.title,
          message: GETTING_VIDEO_URL_FROM_CLIPBOARD.message,
        });
        setVideoURL(clipboardVideoUrl);
        return;
      }

      if (!input && environment.canAccess(BrowserExtension)) {
        const tabs = await BrowserExtension.getTabs();
        const activeTabVideoUrl = tabs.find((tab) => tab.active)?.url;
        const browserVideoUrl = getYouTubeVideoUrl(activeTabVideoUrl);
        if (browserVideoUrl) {
          showToast({
            style: Toast.Style.Animated,
            title: GETTING_VIDEO_URL_FROM_BROWSER.title,
            message: GETTING_VIDEO_URL_FROM_BROWSER.message,
          });
          setVideoURL(browserVideoUrl);
          return;
        }
      }

      showToast({
        style: Toast.Style.Failure,
        title: "No video URL found",
        message: "Please provide a valid YouTube video URL or ID.",
      });
      popToRoot();
    };

    fetchData();
  }, [input, setVideoURL]);
};
