import { Action, ActionPanel, Icon, List, Toast as RaycastToast, useNavigation } from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";
import { useState } from "react";
import { Ffmpeg } from "./objects/ffmpeg";
import { Ffprobe } from "./objects/ffprobe";
import { Gif } from "./objects/gif";
import { SelectedFinderFiles } from "./objects/selected-finder.files";
import { Toast } from "./objects/toast";
import { Video } from "./objects/video";

export default function Command() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number | undefined>(undefined);
  const [type, setType] = useState<"mp4" | "webm" | "gif" | undefined>();
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

  const encodeMp4 = async () => {
    setType("mp4");
    setIsLoading(true);
    const selectedFiles = await files.list();

    if (selectedFiles.length === 0) {
      await toast.show({ title: "Please select any video in Finder", style: RaycastToast.Style.Failure });
      return;
    }

    for (const file of selectedFiles) {
      try {
        await new Video(file, ffmpeg).encode({ format: "mp4" });
      } catch (err) {
        if (err instanceof Error) {
          await toast.show({
            title: err.message,
            style: RaycastToast.Style.Failure,
          });
        }
        return;
      }
    }

    await toast.show({ title: "All videos processed", style: RaycastToast.Style.Success });
    setIsLoading(false);
    setProgress(undefined);
    setType(undefined);
    pop();
  };

  const encodeWebm = async () => {
    setType("webm");
    setIsLoading(true);
    const selectedFiles = await files.list();

    if (selectedFiles.length === 0) {
      await toast.show({ title: "Please select any video in Finder", style: RaycastToast.Style.Failure });
      return;
    }

    for (const file of selectedFiles) {
      try {
        await new Video(file, ffmpeg).encode({ format: "webm" });
      } catch (err) {
        if (err instanceof Error) {
          await toast.show({
            title: err.message,
            style: RaycastToast.Style.Failure,
          });
        }
        return;
      }
    }

    await toast.show({ title: "All videos processed", style: RaycastToast.Style.Success });
    setIsLoading(false);
    setProgress(undefined);
    setType(undefined);
    pop();
  };

  const encodeGif = async () => {
    setType("gif");
    setIsLoading(true);
    const selectedFiles = await files.list();

    if (selectedFiles.length === 0) {
      await toast.show({ title: "Please select any video in Finder", style: RaycastToast.Style.Failure });
      return;
    }

    for (const file of selectedFiles) {
      try {
        await new Gif(file, ffmpeg).encode();
      } catch (err) {
        if (err instanceof Error) {
          await toast.show({
            title: err.message,
            style: RaycastToast.Style.Failure,
          });
        }
        return;
      }
    }

    await toast.show({ title: "All videos processed", style: RaycastToast.Style.Success });
    setIsLoading(false);
    setProgress(undefined);
    setType(undefined);
    pop();
  };

  return (
    <List isLoading={isLoading}>
      <List.Item
        icon={progress != null && type === "mp4" ? getProgressIcon(progress, "#374FD5") : Icon.ChevronRightSmall}
        title=".mp4"
        actions={
          <ActionPanel>
            <Action title="Convert Video" onAction={encodeMp4} />
          </ActionPanel>
        }
      />

      <List.Item
        icon={progress != null && type === "webm" ? getProgressIcon(progress, "#374FD5") : Icon.ChevronRightSmall}
        title=".webm"
        actions={
          <ActionPanel>
            <Action title="Convert Video" onAction={encodeWebm} />
          </ActionPanel>
        }
      />

      <List.Item
        icon={progress != null && type === "gif" ? getProgressIcon(progress, "#374FD5") : Icon.ChevronRightSmall}
        title=".gif"
        actions={
          <ActionPanel>
            <Action title="Convert GIF" onAction={encodeGif} />
          </ActionPanel>
        }
      />
    </List>
  );
}
