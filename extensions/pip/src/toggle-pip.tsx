import { closeMainWindow } from "@raycast/api";
import { VideoActionType } from "./utils/constants";
import { handleVideoAction } from "./utils/video-utils";

export default async () => {
  await closeMainWindow();
  await handleVideoAction(VideoActionType.Pip);
};
