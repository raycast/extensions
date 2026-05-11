import { BrowserExtension, Clipboard, environment, popToRoot, showToast, Toast } from "@raycast/api";
import { useEffect } from "react";
import ytdl from "ytdl-core";
import {
  GETTING_VIDEO_URL,
  GETTING_VIDEO_URL_FROM_BROWSER,
  GETTING_VIDEO_URL_FROM_CLIPBOARD,
} from "../const/toast_messages";

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

      if (input && ytdl.validateURL(input)) {
        setVideoURL(input);
        return;
      }

      const clipboardText = await Clipboard.readText();
      const clipboardIsYTUrl = clipboardText && ytdl.validateURL(clipboardText);

      if (!input && clipboardIsYTUrl) {
        showToast({
          style: Toast.Style.Animated,
          title: GETTING_VIDEO_URL_FROM_CLIPBOARD.title,
          message: GETTING_VIDEO_URL_FROM_CLIPBOARD.message,
        });
        setVideoURL(clipboardText);
        return;
      }

      if (!input && environment.canAccess(BrowserExtension)) {
        const tabs = await BrowserExtension.getTabs();
        const activeTab = tabs.find((tab) => tab.active && ytdl.validateURL(tab.url));
        if (activeTab) {
          showToast({
            style: Toast.Style.Animated,
            title: GETTING_VIDEO_URL_FROM_BROWSER.title,
            message: GETTING_VIDEO_URL_FROM_BROWSER.message,
          });
          setVideoURL(activeTab.url);
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
