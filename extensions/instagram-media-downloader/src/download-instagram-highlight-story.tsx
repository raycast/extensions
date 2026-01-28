import { useState, useEffect } from "react";
import {
  LaunchProps,
  Toast,
  showToast,
  getPreferenceValues,
  popToRoot,
  Grid,
  ActionPanel,
  Action,
  Icon,
} from "@raycast/api";
import { getInstagramHighlightStoryURL, handleDownload } from "./download-media";
import { homedir } from "os";

export default function Command({
  arguments: { instagramUrl },
}: LaunchProps<{
  arguments: { instagramUrl: string };
}>) {
  const { mediaDownloadPath } = getPreferenceValues();
  const [isLoading, setIsLoading] = useState(true);
  const [highlightUrls, setHighlightUrls] = useState<{ img: string; url: string }[]>([]);
  const downloadFolder = mediaDownloadPath || `${homedir()}/Downloads`;

  useEffect(() => {
    const fetchHighlightStory = async () => {
      if (!instagramUrl.includes("instagram.com")) {
        popToRoot();
        await showToast({
          title: "Error",
          message: "Invalid URL provided. Please provide a valid instagram URL",
          style: Toast.Style.Failure,
        });
        return;
      }

      try {
        const parsedUrl = new URL(instagramUrl);
        const pathParts = parsedUrl.pathname.replace(/^\/+|\/+$/g, "").split("/");

        if (pathParts.length !== 3 || pathParts[0] !== "stories" || pathParts[1] !== "highlights") {
          popToRoot();
          await showToast({
            title: "Error",
            message: "Invalid Instagram highlight story URL format.",
            style: Toast.Style.Failure,
          });
          return;
        }

        const highlightUrls = await getInstagramHighlightStoryURL(instagramUrl);

        if (highlightUrls.length === 0) {
          popToRoot();
          await showToast({
            title: "Error",
            message: "No highlight story found at the provided URL",
            style: Toast.Style.Failure,
          });
          return;
        }

        highlightUrls.reverse();

        setHighlightUrls(highlightUrls);
        setIsLoading(false);
      } catch (error) {
        popToRoot();
        await showToast({
          title: "Error",
          message: error instanceof Error ? error.message : "Unknown error occurred",
          style: Toast.Style.Failure,
        });
      }
    };

    fetchHighlightStory();
  }, []);

  return (
    <Grid isLoading={isLoading} columns={5} fit={Grid.Fit.Fill}>
      {highlightUrls.map((item) => (
        <Grid.Item
          key={item.url}
          content={item.img}
          actions={
            <ActionPanel>
              <Action
                title="Download Story"
                icon={Icon.Download}
                onAction={async () => {
                  try {
                    const mediaExtension = item.url.includes(".jpg") ? ".jpg" : ".mp4";
                    const fileId = item.url.includes(".jpg")
                      ? item.url.split(".jpg")[0].split("/").pop()
                      : item.url.split(".mp4")[0].split("/").pop();
                    await handleDownload(item.url, fileId || "instagram-story", downloadFolder, mediaExtension);
                  } catch (error) {
                    await showToast({
                      title: "Error",
                      message: error instanceof Error ? error.message : "Unknown error occurred",
                      style: Toast.Style.Failure,
                    });
                  }
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
