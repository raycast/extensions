import { Action, ActionPanel, Icon, List, Toast as RaycastToast, useNavigation } from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";
import { useState } from "react";
import { Ffmpeg } from "./objects/ffmpeg";
import { Ffprobe } from "./objects/ffprobe";
import { Gif } from "./objects/gif";
import { FinderIsNotFrontmostApp, SelectedFinderFiles } from "./objects/selected-finder.files";
import { Toast } from "./objects/toast";
import { Video } from "./objects/video";

type Format = "mp4" | "webm" | "gif";
const supportedFormats: Format[] = ["mp4", "webm", "gif"];

export default function Command() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number | undefined>(undefined);
  const [type, setType] = useState<Format>();
  const { pop } = useNavigation();

  const toast = new Toast();
  const files = new SelectedFinderFiles();
  const ffmpeg = new Ffmpeg(
    new Ffprobe({
      onStatusChange: async (status) => {
        await toast.show({ title: status, style: RaycastToast.Style.Animated });
      },
    }),
    {
      onStatusChange: async (status) => {
        await toast.show({ title: status, style: RaycastToast.Style.Animated });
      },
      onProgressChange: async (progress) => {
        setProgress(progress);
        await toast.updateProgress(Math.round(progress * 100));
      },
    },
  );

  const convertTo = async (format: Format) => {
    setType(format);
    setIsLoading(true);

    try {
      const selectedFiles = await files.list();

      if (selectedFiles.length === 0) {
        throw new Error("Please select any Video in Finder");
      }

      for (const file of selectedFiles) {
        if (format === "gif") {
          await new Gif(file, ffmpeg).encode();
          continue;
        }

        await new Video(file, ffmpeg).encode({ format });
      }

      await toast.show({ title: "All Videos are Processed", style: RaycastToast.Style.Success });
      pop();
    } catch (err) {
      if (err instanceof FinderIsNotFrontmostApp) {
        await toast.show({ title: "Please put Finder in focus and try again", style: RaycastToast.Style.Failure });
        return;
      }

      if (err instanceof Error) {
        console.error(err);
        await toast.show({ title: err.message, style: RaycastToast.Style.Failure });
      }
    } finally {
      setIsLoading(false);
      setProgress(undefined);
      setType(undefined);
    }
  };

  return (
    <List isLoading={isLoading}>
      {supportedFormats.map((format) => (
        <List.Item
          key={format}
          icon={progress != null && type === format ? getProgressIcon(progress, "#374FD5") : Icon.ChevronRightSmall}
          title={`.${format.toUpperCase()}`}
          actions={
            <ActionPanel>
              <Action title={`Convert to ${format.toUpperCase()}`} onAction={() => convertTo(format)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
